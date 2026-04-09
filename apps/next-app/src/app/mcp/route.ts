import { baseURL } from "@/../baseUrl";
import { registerWidgetTools } from "@repo/mcp-server/widget";
import { createMcpHandler } from "mcp-handler";

const handler = createMcpHandler(async (server) => {
  await registerWidgetTools(server, { baseURL });
});

export const GET = handler;
export const POST = handler;
