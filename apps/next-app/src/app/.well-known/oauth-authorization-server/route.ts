import {
  GRANT_CLAIM,
  GRANT_JWT_BEARER,
  buildAgentAuthBlock,
} from "@/lib/agent-auth/discovery";
import { getSiteUrl } from "@/lib/site-config";

export async function GET(): Promise<Response> {
  const issuer = getSiteUrl();
  const body = {
    issuer,
    authorization_endpoint: `${issuer}/api/auth/oauth2/authorize`,
    token_endpoint: `${issuer}/api/auth/oauth2/token`,
    jwks_uri: `${issuer}/api/auth/oauth2/jwks`,
    registration_endpoint: `${issuer}/api/auth/oauth2/register`,
    revocation_endpoint: `${issuer}/oauth2/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
      GRANT_JWT_BEARER,
      GRANT_CLAIM,
    ],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
    scopes_supported: ["openid", "profile", "email", "api.read", "api.write"],
    agent_auth: buildAgentAuthBlock(),
  };

  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
