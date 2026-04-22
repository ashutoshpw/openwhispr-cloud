import type { LoadedMCPServer } from "./mcp-runtime";

/**
 * Minimal MCP JSON-RPC client for proxying calls to installed
 * custom-mcp-server installations.
 *
 * The custom-mcp-server provider speaks JSON-RPC 2.0 over HTTP POST,
 * with `tools/list` and `tools/call` methods (matching the MCP spec).
 */

export type MCPTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type MCPToolResult = {
  content?: Array<{ type: string; text?: string; [k: string]: unknown }>;
  isError?: boolean;
  [k: string]: unknown;
};

type JsonRpcResponse<T> =
  | { jsonrpc: "2.0"; id: number; result: T }
  | { jsonrpc: "2.0"; id: number; error: { code: number; message: string } };

async function rpc<T>(
  server: LoadedMCPServer,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(server.endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...server.headers },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      ...(params ? { params } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(
      `MCP server '${server.displayName}' responded ${res.status} ${res.statusText}`,
    );
  }
  const payload = (await res.json()) as JsonRpcResponse<T>;
  if ("error" in payload) {
    throw new Error(
      `MCP server '${server.displayName}' error: ${payload.error.message}`,
    );
  }
  return payload.result;
}

/**
 * List tools exposed by an installed MCP server, honouring the
 * installation's toolAllowlist.
 */
export async function listTools(server: LoadedMCPServer): Promise<MCPTool[]> {
  const result = await rpc<{ tools?: MCPTool[] }>(server, "tools/list");
  const tools = result.tools ?? [];
  if (!server.toolAllowlist) return tools;
  const allowed = new Set(server.toolAllowlist);
  return tools.filter((t) => allowed.has(t.name));
}

/**
 * Invoke a tool on an installed MCP server. Throws if the tool is not
 * in the allowlist when one is configured.
 */
export async function callTool(
  server: LoadedMCPServer,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<MCPToolResult> {
  if (server.toolAllowlist && !server.toolAllowlist.includes(toolName)) {
    throw new Error(
      `Tool '${toolName}' is not in the allowlist for '${server.displayName}'.`,
    );
  }
  return rpc<MCPToolResult>(server, "tools/call", {
    name: toolName,
    arguments: args,
  });
}
