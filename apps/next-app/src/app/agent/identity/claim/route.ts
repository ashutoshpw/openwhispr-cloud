import { recordAudit } from "@/lib/agent-auth/audit";
import { mintClaimAttempt } from "@/lib/agent-auth/claims";
import { sha256Hex } from "@/lib/agent-auth/keys";
import {
  clientIp,
  expireStaleRegistrations,
} from "@/lib/agent-auth/registrations";
import { absoluteUrl } from "@/lib/site-config";
import { db } from "@repo/database";
import { agentRegistration } from "@repo/database/schema-agent-auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /agent/identity/claim — claim ceremony entry + user_code re-mint.
 * Used by anonymous registrations to start the ceremony (with an email
 * binding) and by both anonymous/service_auth to mint a fresh code after
 * expired_token. Body: { claim_token, email }.
 */
export async function POST(request: Request): Promise<Response> {
  let body: { claim_token?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "Body must be JSON" },
      { status: 400 },
    );
  }

  const claimToken = body.claim_token;
  const email = body.email?.trim().toLowerCase();
  if (!claimToken || !email || !email.includes("@")) {
    return NextResponse.json(
      {
        error: "invalid_request",
        message: "claim_token and a valid email are required",
      },
      { status: 400 },
    );
  }

  await expireStaleRegistrations();

  const [registration] = await db()
    .select()
    .from(agentRegistration)
    .where(eq(agentRegistration.claimTokenHash, sha256Hex(claimToken)))
    .limit(1);

  if (!registration) {
    return NextResponse.json(
      { error: "invalid_claim_token", message: "Unknown claim token." },
      { status: 400 },
    );
  }
  if (registration.status === "claimed") {
    return NextResponse.json(
      {
        error: "claimed_or_in_flight",
        message: "This registration has already been claimed.",
      },
      { status: 400 },
    );
  }
  if (
    registration.status === "expired" ||
    registration.status === "revoked" ||
    (registration.claimExpiresAt &&
      registration.claimExpiresAt.getTime() < Date.now())
  ) {
    return NextResponse.json(
      {
        error: "claim_expired",
        message: "The registration expired before the claim was completed.",
      },
      { status: 410 },
    );
  }

  // Bind the registration to the human the agent is acting for.
  await db()
    .update(agentRegistration)
    .set({ claimEmail: email })
    .where(eq(agentRegistration.id, registration.id));

  const attempt = await mintClaimAttempt({
    registration: { id: registration.id, tenantId: registration.tenantId },
    ip: clientIp(request),
  });

  await recordAudit({
    tenantId: registration.tenantId,
    event: "claim.requested",
    registrationId: registration.id,
    email,
    ip: clientIp(request),
  });

  return NextResponse.json({
    registration_id: registration.id,
    claim_attempt_id: attempt.claimAttemptId,
    status: "initiated",
    expires_at: registration.claimExpiresAt?.toISOString() ?? null,
    claim_url: absoluteUrl("/agent/identity/claim"),
    claim_attempt: {
      user_code: attempt.userCode,
      expires_in: Math.max(
        0,
        Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000),
      ),
      verification_uri: attempt.verificationUri,
      interval: attempt.interval,
    },
  });
}
