import { recordAudit } from "@/lib/agent-auth/audit";
import { POLL_INTERVAL_SECONDS } from "@/lib/agent-auth/claims";
import { GRANT_CLAIM, GRANT_JWT_BEARER } from "@/lib/agent-auth/discovery";
import {
  getSigningKey,
  recordIssuedToken,
  sha256Hex,
  signAccessToken,
  signIdentityAssertion,
} from "@/lib/agent-auth/keys";
import {
  expireStaleRegistrations,
  getRegistration,
  resolveScopes,
} from "@/lib/agent-auth/registrations";
import { getSiteUrl } from "@/lib/site-config";
import { db } from "@repo/database";
import {
  agentClaimAttempt,
  agentRegistration,
} from "@repo/database/schema-agent-auth";
import { desc, eq } from "drizzle-orm";
import { type JWTPayload, jwtVerify } from "jose";
import { NextResponse } from "next/server";

function oauthError(
  error: string,
  description: string,
  status = 400,
): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status },
  );
}

/**
 * POST /oauth2/token — agent credential issuance (auth.md protocol).
 * Grants: urn:ietf:params:oauth:grant-type:jwt-bearer (RFC 7523) and,
 * from Phase 2, urn:workos:agent-auth:grant-type:claim (ceremony polling).
 */
export async function POST(request: Request): Promise<Response> {
  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return oauthError("invalid_request", "Body must be form-encoded");
  }

  const grantType = form.get("grant_type");
  if (grantType === GRANT_CLAIM) {
    return handleClaimGrant(form);
  }
  if (grantType !== GRANT_JWT_BEARER) {
    return oauthError(
      "unsupported_grant_type",
      `grant_type must be ${GRANT_JWT_BEARER} or ${GRANT_CLAIM}`,
    );
  }

  const assertion = form.get("assertion");
  if (!assertion) {
    return oauthError("invalid_request", "assertion parameter is required");
  }

  await expireStaleRegistrations();

  // Verify the service-signed identity_assertion (typ oauth-id-jag+jwt).
  const { privateKey } = await getSigningKey();
  const issuer = getSiteUrl();
  let payload: JWTPayload;
  try {
    const verified = await jwtVerify(assertion, privateKey, {
      issuer,
      audience: issuer,
    });
    if (
      (verified.protectedHeader.typ ?? "").toLowerCase() !== "oauth-id-jag+jwt"
    ) {
      return oauthError("invalid_grant", "unexpected assertion typ");
    }
    payload = verified.payload;
  } catch {
    return oauthError(
      "invalid_grant",
      "assertion is invalid, expired or revoked — restart registration at /agent/identity",
    );
  }

  const registration = await getRegistration(String(payload.sub ?? ""));
  if (!registration) {
    return oauthError("invalid_grant", "registration not found");
  }
  if (registration.status === "revoked") {
    return oauthError("invalid_grant", "registration has been revoked");
  }
  if (registration.status === "expired") {
    return oauthError("invalid_grant", "registration has expired");
  }

  const scope = resolveScopes(registration);
  const token = await signAccessToken({
    registrationId: registration.id,
    scope,
    tenantId: registration.tenantId,
  });
  await recordIssuedToken({
    tenantId: registration.tenantId,
    registrationId: registration.id,
    jti: token.jti,
    scope,
    expiresAt: token.expiresAt,
  });

  await db()
    .update(agentRegistration)
    .set({ lastTokenIssuedAt: new Date() })
    .where(eq(agentRegistration.id, registration.id));

  await recordAudit({
    tenantId: registration.tenantId,
    event: "token.issued",
    registrationId: registration.id,
    metadata: { scope, grant: GRANT_JWT_BEARER },
  });

  return NextResponse.json({
    access_token: token.jwt,
    token_type: "Bearer",
    expires_in: token.expiresIn,
    scope,
  });
}

/**
 * Claim-ceremony polling grant (RFC 8628-shaped). Returns authorization_pending
 * while the user has not confirmed, expired_token once windows close, and the
 * standard token response (plus identity_assertion) on success.
 */
async function handleClaimGrant(form: URLSearchParams): Promise<NextResponse> {
  const claimToken = form.get("claim_token");
  if (!claimToken) {
    return oauthError("invalid_request", "claim_token parameter is required");
  }

  await expireStaleRegistrations();

  const [registration] = await db()
    .select()
    .from(agentRegistration)
    .where(eq(agentRegistration.claimTokenHash, sha256Hex(claimToken)))
    .limit(1);

  if (
    !registration ||
    registration.status === "expired" ||
    registration.status === "revoked"
  ) {
    return oauthError("expired_token", "The claim ceremony window has closed.");
  }

  // RFC 8628 slow_down: honor the advertised interval.
  if (registration.lastPollAt) {
    const sinceMs = Date.now() - registration.lastPollAt.getTime();
    if (sinceMs < POLL_INTERVAL_SECONDS * 1000 * 0.8) {
      return oauthError(
        "slow_down",
        "Polling too fast; add at least 5s to your interval.",
      );
    }
  }
  await db()
    .update(agentRegistration)
    .set({ lastPollAt: new Date() })
    .where(eq(agentRegistration.id, registration.id));

  if (registration.status === "unclaimed") {
    // Pending unless the latest code window lapsed while the outer window is open.
    const [latestAttempt] = await db()
      .select({ expiresAt: agentClaimAttempt.expiresAt })
      .from(agentClaimAttempt)
      .where(eq(agentClaimAttempt.registrationId, registration.id))
      .orderBy(desc(agentClaimAttempt.createdAt))
      .limit(1);

    if (!latestAttempt || latestAttempt.expiresAt.getTime() < Date.now()) {
      if (
        registration.claimExpiresAt &&
        registration.claimExpiresAt.getTime() < Date.now()
      ) {
        return oauthError(
          "expired_token",
          "The claim ceremony window has closed.",
        );
      }
      return oauthError(
        "expired_token",
        "The user_code window expired; re-initiate via the claim endpoint for a fresh code.",
      );
    }
    return oauthError(
      "authorization_pending",
      "The user has not yet completed the ceremony.",
    );
  }

  // status === "claimed": issue the post-claim credential.
  const scope = resolveScopes(registration);
  const token = await signAccessToken({
    registrationId: registration.id,
    scope,
    tenantId: registration.tenantId,
  });
  await recordIssuedToken({
    tenantId: registration.tenantId,
    registrationId: registration.id,
    jti: token.jti,
    scope,
    expiresAt: token.expiresAt,
  });

  // Anonymous: v2 assertion carries the user's email; service_auth: first assertion.
  const assertion = await signIdentityAssertion({
    registrationId: registration.id,
    scopes: scope,
    registrationType: registration.type,
    email: registration.claimEmail,
    emailVerified: true,
  });

  await db()
    .update(agentRegistration)
    .set({
      lastTokenIssuedAt: new Date(),
      assertionExpiresAt: assertion.expiresAt,
    })
    .where(eq(agentRegistration.id, registration.id));

  await recordAudit({
    tenantId: registration.tenantId,
    event: "token.issued",
    registrationId: registration.id,
    metadata: { scope, grant: GRANT_CLAIM },
  });

  return NextResponse.json({
    access_token: token.jwt,
    token_type: "Bearer",
    expires_in: token.expiresIn,
    scope,
    identity_assertion: assertion.jwt,
    assertion_expires: assertion.expiresAt.toISOString(),
  });
}
