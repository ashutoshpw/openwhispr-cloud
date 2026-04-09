import { getSiteAdminStatus } from "@/lib/auth-utils";
import { auth } from "@repo/auth/server";
import { registerAdminTools } from "@repo/mcp-server/admin";
import { createMcpHandler } from "mcp-handler";
import { headers } from "next/headers";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  const isAdmin = await getSiteAdminStatus(session.user.id);
  if (!isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
}

const handler = createMcpHandler(
  (server) => {
    registerAdminTools(server, requireAdmin);
  },
  {},
  { basePath: "/api" },
);

export { handler as GET, handler as POST };
