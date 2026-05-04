import { getSiteUrl } from "@/lib/site-config";

export async function GET(): Promise<Response> {
  const origin = getSiteUrl();
  const upstream = await fetch(
    `${origin}/api/auth/.well-known/openid-configuration`,
    {
      headers: { accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!upstream.ok) {
    return new Response("OIDC discovery unavailable", {
      status: upstream.status,
    });
  }

  const json = await upstream.json();
  const issuer = origin;

  const normalized = {
    ...json,
    issuer,
    authorization_endpoint: `${issuer}/api/auth/oauth2/authorize`,
    token_endpoint: `${issuer}/api/auth/oauth2/token`,
    userinfo_endpoint: `${issuer}/api/auth/oauth2/userinfo`,
    jwks_uri: `${issuer}/api/auth/oauth2/jwks`,
    registration_endpoint: `${issuer}/api/auth/oauth2/register`,
  };

  return Response.json(normalized, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
