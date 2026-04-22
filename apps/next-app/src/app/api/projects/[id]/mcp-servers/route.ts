import { listTools } from "@/lib/integrations/mcp-proxy";
import { loadMCPServers } from "@/lib/integrations/mcp-runtime";
import { auth } from "@repo/auth/server";
import { and, db, eq } from "@repo/database";
import { member, project } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/mcp-servers
 *
 * Returns the list of installed custom-mcp-server installations visible
 * to this project (project-scoped + workspace-scoped). When `?probe=1`,
 * also calls `tools/list` against each server and includes the tool
 * count or error message.
 *
 * Never returns credentials.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [proj] = await db()
    .select()
    .from(project)
    .where(eq(project.id, id))
    .limit(1);
  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [membership] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, proj.organizationId),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const servers = await loadMCPServers({
    organizationId: proj.organizationId,
    projectId: proj.id,
  });

  const url = new URL(request.url);
  const probe = url.searchParams.get("probe") === "1";

  const result = await Promise.all(
    servers.map(async (s) => {
      const base = {
        installationId: s.installationId,
        displayName: s.displayName,
        endpointUrl: s.endpointUrl,
        authType: s.authType,
        toolAllowlist: s.toolAllowlist,
      };
      if (!probe) return base;
      try {
        const tools = await listTools(s);
        return { ...base, toolCount: tools.length };
      } catch (err) {
        return {
          ...base,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return NextResponse.json(result);
}
