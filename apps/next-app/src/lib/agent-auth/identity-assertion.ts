import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { absoluteUrl } from "@/lib/site-config";
import { db } from "@repo/database";
import { user } from "@repo/database/schema";
import {
  type AgentRegistration,
  agentDelegation,
  agentRegistration,
} from "@repo/database/schema-agent-auth";
import { and, eq } from "drizzle-orm";
import type { JWTPayload } from "jose";
import { NextResponse } from "next/server";
import { recordAudit } from "./audit";
import { POLL_INTERVAL_SECONDS, mintClaimAttempt } from "./claims";
import { verifyIdJag } from "./id-jag";
import { signIdentityAssertion } from "./keys";
import {
  CLAIM_TOKEN_TTL_MS,
  POST_CLAIM_SCOPES,
  REGISTRATION_TTL_DAYS,
  clientIp,
  newClaimToken,
  newRegistrationId,
} from "./registrations";

const DEFAULT_TENANT_ID = "default";

/**
 * Handle type: identity_assertion — provider-minted ID-JAG.
 * Resolution order: delegation match → verified-email step-up → JIT.
 */
export async function registerIdentityAssertion(
  request: Request,
  body: { assertion?: string; assertion_type?: string },
): Promise<Response> {
  const assertion = body.assertion;
  if (!assertion || typeof assertion !== "string") {
    return NextResponse.json(
      { error: "invalid_request", message: "assertion is required" },
      { status: 400 },
    );
  }

  const ip = clientIp(request);
  const result = await verifyIdJag(
    DEFAULT_TENANT_ID,
    assertion,
    body.assertion_type,
  );
  if (!result.ok) {
    const body: Record<string, unknown> = {
      error: result.error,
      error_description: result.message,
    };
    if (result.error === "login_required") {
      body.max_age = Number(process.env.ID_JAG_MAX_AUTH_AGE_SECONDS ?? 3600);
    }
    return NextResponse.json(body, {
      status: result.status ?? 400,
      headers: {
        "WWW-Authenticate": `AgentAuth error="${result.error}", error_description="${result.message}"`,
      },
    });
  }

  const { payload, provider } = result;
  const email = String(payload.email);
  const subject = String(payload.sub ?? "");
  const aud = absoluteUrl("/mcp");

  await recordAudit({
    tenantId: DEFAULT_TENANT_ID,
    event: "registration.created",
    email,
    issuer: provider.issuer,
    subject,
    metadata: {
      registration_type: "identity_assertion",
      agent_platform: provider.displayName,
      agent_context_id: typeof payload.jti === "string" ? payload.jti : null,
    },
    ip,
  });

  // 1) Existing registration for this (iss, sub) pair — reuse its row.
  const [existing] = await db()
    .select()
    .from(agentRegistration)
    .where(
      and(
        eq(agentRegistration.tenantId, DEFAULT_TENANT_ID),
        eq(agentRegistration.issuer, provider.issuer),
        eq(agentRegistration.subject, subject),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "claimed" && existing.userId) {
      return issueCleanAssertion(existing, email, ip);
    }
    if (existing.status === "unclaimed") {
      // Repeat presentation during step-up: re-issue a fresh ceremony.
      return issueStepUp(existing, provider.displayName, ip);
    }
    return NextResponse.json(
      { error: "invalid_grant", message: "Registration is no longer active" },
      { status: 400 },
    );
  }

  // 2) Delegation table match (strongest identifier).
  const [delegation] = await db()
    .select()
    .from(agentDelegation)
    .where(
      and(
        eq(agentDelegation.tenantId, DEFAULT_TENANT_ID),
        eq(agentDelegation.issuer, provider.issuer),
        eq(agentDelegation.subject, subject),
        eq(agentDelegation.audience, aud),
      ),
    )
    .limit(1);

  if (delegation) {
    const registration = await createRegistration({
      type: "identity_assertion",
      status: "claimed",
      userId: delegation.userId,
      issuer: provider.issuer,
      subject,
      providerId: provider.id,
      scopes: POST_CLAIM_SCOPES,
      request,
    });
    return issueCleanAssertion(registration, email, ip);
  }

  // 3) Verified-email match → first-link step-up. Never silently bind.
  const [emailMatch] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  if (emailMatch) {
    const registration = await createRegistration({
      type: "identity_assertion",
      status: "unclaimed",
      claimEmail: email,
      issuer: provider.issuer,
      subject,
      providerId: provider.id,
      request,
    });
    return issueStepUp(registration, provider.displayName, ip);
  }

  // 4) No match → JIT provision a minimal user.
  const userId = `usr_${randomBytes(12).toString("base64url")}`;
  await db()
    .insert(user)
    .values({
      id: userId,
      tenantId: DEFAULT_TENANT_ID,
      name: email.split("@")[0],
      publicEmail: email.toLowerCase(),
      email: email.toLowerCase(),
      emailVerified: true,
      role: "user",
    });

  const registration = await createRegistration({
    type: "identity_assertion",
    status: "claimed",
    userId,
    issuer: provider.issuer,
    subject,
    providerId: provider.id,
    scopes: POST_CLAIM_SCOPES,
    request,
  });
  await recordDelegation(
    registration.id,
    provider.issuer,
    subject,
    aud,
    userId,
  );
  return issueCleanAssertion(registration, email, ip);
}

async function createRegistration(params: {
  type: string;
  status: string;
  userId?: string;
  claimEmail?: string;
  issuer: string;
  subject: string;
  providerId: string;
  scopes?: string;
  request: Request;
}): Promise<AgentRegistration> {
  const id = newRegistrationId();
  const claimToken = newClaimToken();
  await db()
    .insert(agentRegistration)
    .values({
      id,
      tenantId: DEFAULT_TENANT_ID,
      type: params.type,
      status: params.status,
      userId: params.userId ?? null,
      claimEmail: params.claimEmail ?? null,
      claimTokenHash: claimToken.hash,
      claimTokenExpiresAt: claimToken.expiresAt,
      claimExpiresAt:
        params.status === "unclaimed" ? claimToken.expiresAt : null,
      registrationExpiresAt: new Date(
        Date.now() + REGISTRATION_TTL_DAYS * 24 * 60 * 60 * 1000,
      ),
      issuer: params.issuer,
      subject: params.subject,
      providerId: params.providerId,
      scopes: params.scopes ?? POST_CLAIM_SCOPES,
      registrationIp: clientIp(params.request),
      userAgent: params.request.headers.get("user-agent"),
      metadata: { request_id: randomUUID() },
    });

  const [row] = await db()
    .select()
    .from(agentRegistration)
    .where(eq(agentRegistration.id, id))
    .limit(1);
  return row;
}

async function recordDelegation(
  registrationId: string,
  issuer: string,
  subject: string,
  audience: string,
  userId: string,
): Promise<void> {
  await db()
    .insert(agentDelegation)
    .values({
      id: `del_${randomUUID()}`,
      tenantId: DEFAULT_TENANT_ID,
      issuer,
      subject,
      audience,
      userId,
      registrationId,
    })
    .onConflictDoNothing();
}

async function issueCleanAssertion(
  registration: AgentRegistration,
  email: string,
  ip: string | null,
): Promise<Response> {
  const assertion = await signIdentityAssertion({
    registrationId: registration.id,
    scopes: registration.scopes,
    registrationType: registration.type,
    email,
    emailVerified: true,
  });
  await db()
    .update(agentRegistration)
    .set({ assertionExpiresAt: assertion.expiresAt })
    .where(eq(agentRegistration.id, registration.id));

  await recordAudit({
    tenantId: registration.tenantId,
    event: "assertion.issued",
    registrationId: registration.id,
    metadata: { assertion_expires: assertion.expiresAt.toISOString() },
    ip,
  });

  return NextResponse.json({
    registration_id: registration.id,
    registration_type: registration.type,
    identity_assertion: assertion.jwt,
    assertion_expires: assertion.expiresAt.toISOString(),
    scopes: registration.scopes.split(" "),
  });
}

/** 401 interaction_required: user must confirm linking at the claim page. */
async function issueStepUp(
  registration: AgentRegistration,
  providerDisplayName: string,
  ip: string | null,
): Promise<Response> {
  const claimToken = newClaimToken();
  await db()
    .update(agentRegistration)
    .set({
      claimTokenHash: claimToken.hash,
      claimTokenExpiresAt: claimToken.expiresAt,
      claimExpiresAt: claimToken.expiresAt,
    })
    .where(eq(agentRegistration.id, registration.id));

  const attempt = await mintClaimAttempt({
    registration: { id: registration.id, tenantId: registration.tenantId },
    ip,
  });

  await recordAudit({
    tenantId: registration.tenantId,
    event: "claim.requested",
    registrationId: registration.id,
    email: registration.claimEmail,
    metadata: { step_up: true, provider: providerDisplayName },
    ip,
  });

  return NextResponse.json(
    {
      error: "interaction_required",
      error_description:
        "The asserted identity matches an existing account; the user must confirm linking.",
      registration_id: registration.id,
      registration_type: registration.type,
      claim_url: absoluteUrl("/agent/identity/claim"),
      claim_token: claimToken.plaintext,
      claim_token_expires: new Date(
        Date.now() + CLAIM_TOKEN_TTL_MS,
      ).toISOString(),
      post_claim_scopes: POST_CLAIM_SCOPES.split(" "),
      claim: {
        user_code: attempt.userCode,
        expires_in: Math.max(
          0,
          Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000),
        ),
        verification_uri: attempt.verificationUri,
        interval: attempt.interval ?? POLL_INTERVAL_SECONDS,
      },
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'AgentAuth error="interaction_required"',
      },
    },
  );
}
