import "server-only";

import { getSiteUrl } from "@/lib/site-config";
import { db } from "@repo/database";
import { agentRegistration } from "@repo/database/schema-agent-auth";
import { eq } from "drizzle-orm";
import { type JWTPayload, jwtVerify } from "jose";
import { getSigningKey, isTokenRevoked } from "./keys";
import { resolveScopes } from "./registrations";

export type AgentTokenContext = {
  registrationId: string;
  tenantId: string;
  userId: string | null;
  organizationId: string | null;
  scope: string;
  status: string;
};

/**
 * Verify an agent access token (JWT bearer) issued by /oauth2/token.
 * Returns the registration context, or null when the token is not a valid
 * unrevoked agent token. Signature + expiry are checked via jose; revocation
 * and registration liveness are checked against the database.
 */
export async function verifyAgentAccessToken(
  req: Request,
): Promise<AgentTokenContext | null> {
  const authz = req.headers.get("authorization") ?? "";
  const match = authz.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  // Agent tokens are compact JWS; opaque account tokens (cet_/clm_) are not.
  if (token.startsWith("cet_") || token.startsWith("clm_")) return null;

  let payload: JWTPayload;
  try {
    const { privateKey } = await getSigningKey();
    const issuer = getSiteUrl();
    const verified = await jwtVerify(token, privateKey, {
      issuer,
      audience: issuer,
    });
    if ((verified.protectedHeader.typ ?? "").toLowerCase() !== "at+jwt")
      return null;
    payload = verified.payload;
  } catch {
    return null;
  }

  const jti = String(payload.jti ?? "");
  if (!jti || (await isTokenRevoked(jti))) return null;

  const registrationId = String(payload.sub ?? "");
  const [registration] = await db()
    .select()
    .from(agentRegistration)
    .where(eq(agentRegistration.id, registrationId))
    .limit(1);
  if (!registration) return null;
  if (registration.status === "revoked" || registration.status === "expired") {
    return null;
  }

  return {
    registrationId: registration.id,
    tenantId: registration.tenantId,
    userId: registration.userId,
    organizationId: registration.organizationId,
    scope: resolveScopes(registration),
    status: registration.status,
  };
}

export function hasScope(ctx: AgentTokenContext, scope: string): boolean {
  return ctx.scope.split(" ").includes(scope);
}
