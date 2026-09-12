import { AGENT_SCOPES_SUPPORTED } from "@/lib/agent-auth/discovery";
import { absoluteUrl, getSiteUrl } from "@/lib/site-config";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      resource: absoluteUrl("/mcp"),
      authorization_servers: [getSiteUrl()],
      scopes_supported: AGENT_SCOPES_SUPPORTED,
      bearer_methods_supported: ["header"],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    },
  );
}
