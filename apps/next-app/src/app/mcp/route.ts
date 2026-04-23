import { baseURL } from "@/../baseUrl";
import { verifyAccountToken } from "@/lib/auth/account-token";
import { registerWidgetTools } from "@repo/mcp-server/widget";
import { createMcpHandler } from "mcp-handler";
import { NextResponse } from "next/server";

const handler = createMcpHandler(async (server) => {
  await registerWidgetTools(server, { baseURL });
});

async function withAuth(req: Request) {
  // Allow unauthenticated requests only when explicitly opted-in (e.g. local dev).
  if (process.env.MCP_REQUIRE_AUTH === "false") {
    return null;
  }
  const result = await verifyAccountToken(req);
  if (!result) {
    return NextResponse.json(
      { error: "unauthorized", message: "Bearer token required" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  return null;
}

export async function GET(req: Request) {
  const denied = await withAuth(req);
  return denied ?? handler(req);
}

export async function POST(req: Request) {
  const denied = await withAuth(req);
  return denied ?? handler(req);
}
