import { baseURL } from "@/../baseUrl";
import { bearerChallenge } from "@/lib/agent-auth/discovery";
import { verifyAgentAccessToken } from "@/lib/agent-auth/tokens";
import { verifyAccountToken } from "@/lib/auth/account-token";
import {
  logMcpRequest,
  logMcpResponse,
  runWithMcpContext,
} from "@repo/mcp-chatgpt";
import { registerWidgetTools } from "@repo/mcp-server/widget";
import { createMcpHandler } from "mcp-handler";
import { NextResponse } from "next/server";

const handler = createMcpHandler(async (server) => {
  await registerWidgetTools(server, { baseURL });
});

function collectHeaders(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

async function withAuth(
  req: Request,
): Promise<
  | { error: NextResponse; userId?: never }
  | { error?: never; userId: string | null }
> {
  if (process.env.MCP_REQUIRE_AUTH === "false") {
    return { userId: null };
  }
  // Agent access tokens (auth.md flow) take precedence over opaque account tokens.
  const agentToken = await verifyAgentAccessToken(req);
  if (agentToken) {
    return { userId: agentToken.userId };
  }
  const result = await verifyAccountToken(req);
  if (!result) {
    return {
      error: NextResponse.json(
        { error: "unauthorized", message: "Bearer token required" },
        { status: 401, headers: { "WWW-Authenticate": bearerChallenge() } },
      ),
    };
  }
  return { userId: (result as { userId?: string }).userId ?? null };
}

async function handleMcp(req: Request, method: string): Promise<Response> {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  logMcpRequest(requestId, method, "/mcp", collectHeaders(req));

  const authResult = await withAuth(req);
  if (authResult.error) {
    logMcpResponse(requestId, 401, Date.now() - start, "Unauthorized");
    return authResult.error;
  }

  try {
    const ctx = { requestId, userId: authResult.userId ?? undefined };
    return await runWithMcpContext(ctx, async () => {
      const response = await handler(req);
      logMcpResponse(requestId, response.status, Date.now() - start);
      return response;
    });
  } catch (err) {
    logMcpResponse(
      requestId,
      500,
      Date.now() - start,
      err instanceof Error ? err : new Error(String(err)),
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handleMcp(req, "GET");
}

export async function POST(req: Request) {
  return handleMcp(req, "POST");
}
