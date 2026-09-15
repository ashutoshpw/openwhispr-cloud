import type { McpKeyContext } from "@/lib/mcp-auth";
import { resolveApiKey } from "@/lib/mcp-auth";
import { ToolScopeError, findTool, visibleTools } from "@/lib/mcp-tools";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Stateless Streamable HTTP MCP server.
 *
 * Every POST carries its own API key (`Authorization: Bearer owk_live_…` /
 * `ow_wks_live_…`) — the key IS the session, so there is no initialize-time
 * state to keep. The endpoint answers JSON-RPC result objects for requests,
 * 202 for notifications, and JSON-RPC errors (-32xxx) for failures.
 */

const SERVER_INFO = { name: "openwhispr-notes-mcp", version: "1.0.0" };
const SUPPORTED_PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  status = 200,
) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status },
  );
}

function accepted() {
  return new NextResponse(null, { status: 202 });
}

function isNotification(message: JsonRpcRequest): boolean {
  return !("id" in message);
}

async function handleAuthenticated(
  ctx: McpKeyContext,
  message: JsonRpcRequest,
): Promise<NextResponse | null> {
  switch (message.method) {
    case "initialize": {
      const requested = message.params?.protocolVersion;
      return jsonRpcResult(message.id ?? null, {
        protocolVersion:
          typeof requested === "string"
            ? requested
            : SUPPORTED_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "OpenWhispr notes tools. Authenticate with an API key via the Authorization: Bearer header.",
      });
    }
    case "ping":
      return jsonRpcResult(message.id ?? null, {});
    case "tools/list":
      return jsonRpcResult(message.id ?? null, {
        tools: visibleTools(ctx).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });
    case "tools/call": {
      const params = message.params ?? {};
      const name = typeof params.name === "string" ? params.name : null;
      const tool = name ? findTool(name) : undefined;
      if (!tool) {
        return jsonRpcError(
          message.id ?? null,
          -32602,
          `Unknown tool: ${name ?? "(missing)"}`,
        );
      }
      const args =
        params.arguments && typeof params.arguments === "object"
          ? (params.arguments as Record<string, unknown>)
          : {};
      try {
        const output = await tool.handler(ctx, args);
        return jsonRpcResult(message.id ?? null, {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        });
      } catch (error) {
        if (error instanceof ToolScopeError) {
          return jsonRpcResult(message.id ?? null, {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          });
        }
        console.error(`[mcp] tool ${tool.name} failed:`, error);
        return jsonRpcResult(message.id ?? null, {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Internal error"}`,
            },
          ],
          isError: true,
        });
      }
    }
    default:
      if (message.method?.startsWith("notifications/")) return null;
      return jsonRpcError(
        message.id ?? null,
        -32601,
        `Method not found: ${message.method ?? "(missing)"}`,
      );
  }
}

export async function POST(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Unauthorized: valid API key required",
        },
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="mcp"' },
      },
    );
  }

  const rate = checkRateLimit(ctx.keyId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32002, message: "Rate limit exceeded" },
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  if (body === null) {
    return jsonRpcError(null, -32700, "Parse error", 400);
  }

  const messages: JsonRpcRequest[] = Array.isArray(body)
    ? (body as JsonRpcRequest[])
    : [body as JsonRpcRequest];
  if (messages.length === 0) {
    return jsonRpcError(null, -32600, "Invalid Request", 400);
  }

  const responses: unknown[] = [];
  for (const message of messages) {
    if (!message || typeof message.method !== "string") {
      responses.push({
        jsonrpc: "2.0",
        id: message?.id ?? null,
        error: { code: -32600, message: "Invalid Request" },
      });
      continue;
    }
    const response = await handleAuthenticated(ctx, message);
    if (response) {
      responses.push(await response.json());
    }
  }

  if (responses.length === 0) return accepted();
  if (!Array.isArray(body)) {
    return NextResponse.json(responses[0]);
  }
  return NextResponse.json(responses);
}

export async function GET() {
  // Stateless server: no SSE stream to resume.
  return jsonRpcError(null, -32000, "Method not allowed", 405);
}

export async function DELETE() {
  // Stateless server: nothing to terminate.
  return jsonRpcError(null, -32000, "Method not allowed", 405);
}
