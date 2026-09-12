import "server-only";

import { absoluteUrl, getSiteUrl } from "@/lib/site-config";

export const GRANT_JWT_BEARER = "urn:ietf:params:oauth:grant-type:jwt-bearer";
export const GRANT_CLAIM = "urn:workos:agent-auth:grant-type:claim";
export const ASSERTION_TYPE_ID_JAG = "urn:ietf:params:oauth:token-type:id-jag";
export const REVOKED_EVENT_SCHEMA =
  "https://schemas.workos.com/events/agent/auth/identity/assertion/revoked";

/** Scopes the resource server understands (PRM + AS metadata). */
export const AGENT_SCOPES_SUPPORTED = [
  "openid",
  "profile",
  "email",
  "api.read",
  "api.write",
];

/** The `agent_auth` profile extension block for the AS metadata document. */
export function buildAgentAuthBlock() {
  const issuer = getSiteUrl();
  return {
    skill: absoluteUrl("/auth.md"),
    identity_endpoint: absoluteUrl("/agent/identity"),
    claim_endpoint: absoluteUrl("/agent/identity/claim"),
    events_endpoint: absoluteUrl("/agent/event/notify"),
    // Agent-specific token surface: only the two agent grants; standard OAuth
    // clients keep using the interactive token_endpoint at the top level.
    token_endpoint: absoluteUrl("/oauth2/token"),
    revocation_endpoint: absoluteUrl("/oauth2/revoke"),
    identity_types_supported: [
      "anonymous",
      "identity_assertion",
      "service_auth",
    ],
    identity_assertion: {
      assertion_types_supported: [ASSERTION_TYPE_ID_JAG],
    },
    events_supported: [REVOKED_EVENT_SCHEMA],
  };
}

/** WWW-Authenticate challenge emitted on 401s from protected resources. */
export function bearerChallenge(): string {
  return `Bearer resource_metadata="${absoluteUrl("/.well-known/oauth-protected-resource")}"`;
}
