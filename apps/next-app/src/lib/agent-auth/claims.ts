import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { absoluteUrl } from "@/lib/site-config";
import { db } from "@repo/database";
import { member } from "@repo/database/schema";
import {
  agentClaimAttempt,
  agentDelegation,
  agentRegistration,
  agentToken,
} from "@repo/database/schema-agent-auth";
import type { AgentRegistration } from "@repo/database/schema-agent-auth";
import { and, eq, isNull } from "drizzle-orm";
import { recordAudit } from "./audit";
import { sha256Hex, signIdentityAssertion } from "./keys";
import {
  POST_CLAIM_SCOPES,
  USER_CODE_TTL_MS,
  newUserCode,
} from "./registrations";

export const MAX_CODE_ATTEMPTS = 5;
export const POLL_INTERVAL_SECONDS = 5;

export type MintedClaimAttempt = {
  claimAttemptId: string;
  attemptToken: string;
  userCode: string;
  expiresAt: Date;
  verificationUri: string;
  interval: number;
};

/**
 * Mint a fresh claim attempt for a registration. Any previous attempt's
 * verification_uri stops working (new attempt_token + user_code are issued).
 */
export async function mintClaimAttempt(params: {
  registration: Pick<AgentRegistration, "id" | "tenantId">;
  ip?: string | null;
}): Promise<MintedClaimAttempt> {
  const attemptToken = `cat_${randomBytes(24).toString("base64url")}`;
  const userCode = newUserCode();
  const expiresAt = new Date(Date.now() + USER_CODE_TTL_MS);
  const id = `cla_${randomUUID()}`;

  await db()
    .insert(agentClaimAttempt)
    .values({
      id,
      tenantId: params.registration.tenantId,
      registrationId: params.registration.id,
      attemptTokenHash: sha256Hex(attemptToken),
      userCodeHash: sha256Hex(userCode),
      status: "initiated",
      expiresAt,
    });

  await db()
    .update(agentRegistration)
    .set({ lastPollAt: null })
    .where(eq(agentRegistration.id, params.registration.id));

  await recordAudit({
    tenantId: params.registration.tenantId,
    event: "user_code.minted",
    registrationId: params.registration.id,
    ip: params.ip ?? null,
  });

  return {
    claimAttemptId: id,
    attemptToken,
    userCode,
    expiresAt,
    verificationUri: verificationUriFor(attemptToken),
    interval: POLL_INTERVAL_SECONDS,
  };
}

/** verification_uri routes through sign-in so the user authenticates first. */
export function verificationUriFor(attemptToken: string): string {
  const claimPath = `/claim?claim_attempt_token=${encodeURIComponent(attemptToken)}`;
  return absoluteUrl(`/auth/sign-in?redirect=${encodeURIComponent(claimPath)}`);
}

export type ClaimCompleteResult =
  | { ok: true; registrationId: string }
  | { ok: false; error: string; message: string };

/**
 * Complete a claim attempt: verify code, enforce the email binding, flip the
 * registration to claimed, swap scopes, and revoke pre-claim tokens.
 */
export async function completeClaim(params: {
  attemptToken: string;
  userCode: string;
  userId: string;
  userEmail: string;
  ip?: string | null;
}): Promise<ClaimCompleteResult> {
  const [attempt] = await db()
    .select()
    .from(agentClaimAttempt)
    .where(
      eq(agentClaimAttempt.attemptTokenHash, sha256Hex(params.attemptToken)),
    )
    .limit(1);
  if (!attempt) {
    return {
      ok: false,
      error: "invalid_request",
      message: "Unknown claim attempt.",
    };
  }

  const [registration] = await db()
    .select()
    .from(agentRegistration)
    .where(eq(agentRegistration.id, attempt.registrationId))
    .limit(1);
  if (!registration || registration.status !== "unclaimed") {
    return {
      ok: false,
      error: "claimed_or_in_flight",
      message: "This registration is not awaiting a claim.",
    };
  }

  if (
    registration.claimExpiresAt &&
    registration.claimExpiresAt.getTime() < Date.now()
  ) {
    return {
      ok: false,
      error: "claim_expired",
      message: "The claim window has closed.",
    };
  }

  // Only the bound human may complete the ceremony.
  if (
    registration.claimEmail &&
    registration.claimEmail.toLowerCase() !== params.userEmail.toLowerCase()
  ) {
    return {
      ok: false,
      error: "forbidden",
      message: `This code can only be claimed by ${registration.claimEmail}. You are signed in as ${params.userEmail}.`,
    };
  }

  if (
    attempt.status !== "initiated" ||
    attempt.expiresAt.getTime() < Date.now()
  ) {
    return {
      ok: false,
      error: "expired_token",
      message: "This code has expired. Ask your agent for a new one.",
    };
  }

  if (attempt.failedAttempts >= MAX_CODE_ATTEMPTS) {
    return {
      ok: false,
      error: "expired_token",
      message: "Too many incorrect attempts. Ask your agent for a new code.",
    };
  }

  if (attempt.userCodeHash !== sha256Hex(params.userCode)) {
    await db()
      .update(agentClaimAttempt)
      .set({ failedAttempts: attempt.failedAttempts + 1 })
      .where(eq(agentClaimAttempt.id, attempt.id));
    return { ok: false, error: "invalid_code", message: "Incorrect code." };
  }

  const organizationId = await resolvePrimaryOrganization(params.userId);

  await db()
    .update(agentClaimAttempt)
    .set({
      status: "completed",
      completedByUserId: params.userId,
      completedAt: new Date(),
      completedIp: params.ip ?? null,
    })
    .where(eq(agentClaimAttempt.id, attempt.id));

  await db()
    .update(agentRegistration)
    .set({
      status: "claimed",
      userId: params.userId,
      organizationId,
      scopes: registration.postClaimScopes || POST_CLAIM_SCOPES,
      firstLinkedAt:
        registration.type === "identity_assertion" ? new Date() : null,
    })
    .where(eq(agentRegistration.id, registration.id));

  // ID-JAG step-up confirmed: persist the (iss, sub, aud) -> user delegation.
  if (
    registration.type === "identity_assertion" &&
    registration.issuer &&
    registration.subject
  ) {
    await db()
      .insert(agentDelegation)
      .values({
        id: `del_${randomUUID()}`,
        tenantId: registration.tenantId,
        issuer: registration.issuer,
        subject: registration.subject,
        audience: absoluteUrl("/mcp"),
        userId: params.userId,
        registrationId: registration.id,
      })
      .onConflictDoNothing();
  }

  // Anonymous: pre-claim access_tokens are revoked — the canonical credential
  // is the post-claim token returned by the claim grant poll.
  await db()
    .update(agentToken)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(agentToken.registrationId, registration.id),
        isNull(agentToken.revokedAt),
      ),
    );

  const assertion = await signIdentityAssertion({
    registrationId: registration.id,
    scopes: registration.postClaimScopes || POST_CLAIM_SCOPES,
    registrationType: registration.type,
    email: params.userEmail,
    emailVerified: true,
  });
  await db()
    .update(agentRegistration)
    .set({ assertionExpiresAt: assertion.expiresAt })
    .where(eq(agentRegistration.id, registration.id));

  await recordAudit({
    tenantId: registration.tenantId,
    event: "claim.confirmed",
    registrationId: registration.id,
    email: registration.claimEmail,
    metadata: { claimed_by_user_id: params.userId },
    ip: params.ip ?? null,
  });

  return { ok: true, registrationId: registration.id };
}

async function resolvePrimaryOrganization(
  userId: string,
): Promise<string | null> {
  const [membership] = await db()
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .limit(1);
  return membership?.organizationId ?? null;
}
