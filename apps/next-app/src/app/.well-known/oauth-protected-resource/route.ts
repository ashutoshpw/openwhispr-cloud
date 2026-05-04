import { absoluteUrl, getSiteUrl } from "@/lib/site-config";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      resource: absoluteUrl("/mcp"),
      authorization_servers: [getSiteUrl()],
      scopes_supported: ["openid", "profile", "email"],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    },
  );
}
