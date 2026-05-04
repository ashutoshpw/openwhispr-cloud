import { absoluteUrl } from "@/lib/site-config";

export async function GET(): Promise<Response> {
  const body = {
    linkset: [
      {
        anchor: absoluteUrl("/mcp"),
        "service-doc": [{ href: absoluteUrl("/docs") }],
        status: [{ href: absoluteUrl("/status") }],
      },
      {
        anchor: absoluteUrl("/api/auth/.well-known/openid-configuration"),
        "service-doc": [{ href: absoluteUrl("/docs") }],
        status: [{ href: absoluteUrl("/status") }],
      },
    ],
  };

  return Response.json(body, {
    headers: {
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
