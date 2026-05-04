import { absoluteUrl } from "@/lib/site-config";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      serverInfo: {
        name: "nextjs-starter-kit-mcp",
        version: "0.1.0",
      },
      transport: {
        type: "http",
        endpoint: absoluteUrl("/mcp"),
      },
      authentication: {
        type: "bearer",
        required: true,
      },
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    },
  );
}
