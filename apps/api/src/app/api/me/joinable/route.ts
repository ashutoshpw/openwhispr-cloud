import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { joinableListResponse } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { joinRequest, member, organization } from "@repo/database/schema";
import { z } from "zod";

/**
 * GET /api/me/joinable → active workspaces on this deployment the caller is
 * not a member of (enterprise "find my company's workspace" flow).
 */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const rows = await db()
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
      })
      .from(organization)
      .where(eq(organization.status, "active"))
      .limit(200);

    const mine = await db()
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, user.id));
    const mineIds = new Set(mine.map((m) => m.organizationId));
    const pending = await db()
      .select({ organizationId: joinRequest.organizationId })
      .from(joinRequest)
      .where(
        and(eq(joinRequest.userId, user.id), eq(joinRequest.status, "pending")),
      );
    const pendingIds = new Set(pending.map((r) => r.organizationId));

    const workspaces = rows
      .filter((r) => !mineIds.has(r.id))
      .map((r) => ({
        workspace_id: r.id,
        name: r.name,
        slug: r.slug,
        logo: r.logo,
        requires_request: pendingIds.has(r.id),
      }));
    return syncOk(joinableListResponse.parse({ workspaces }));
  });
}

/** POST /api/me/joinable { workspace_id } — direct join for open workspaces. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = z.object({ workspace_id: z.string() }).safeParse(body);
    if (!parsed.success) return syncError(400, "workspace_id is required");
    const wid = parsed.data.workspace_id;

    const [org] = await db()
      .select({ id: organization.id })
      .from(organization)
      .where(and(eq(organization.id, wid), eq(organization.status, "active")))
      .limit(1);
    if (!org) return syncError(404, "Workspace not found");

    const [row] = await db()
      .insert(member)
      .values({
        id: crypto.randomUUID(),
        organizationId: wid,
        userId: user.id,
        role: "member",
      })
      .onConflictDoNothing()
      .returning({ id: member.id });
    if (!row) return syncError(409, "Already a member");

    return syncOk({ workspace_id: wid, role: "member" });
  });
}
