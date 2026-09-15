import { withOrg, withOrgAdmin } from "@/lib/org";
import { syncCreated, syncOk } from "@repo/api-schemas/envelope";
import { teamMemberAddRequest } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { team, teamMember, user } from "@repo/database/schema";

/** GET /api/workspaces/{wid}/teams/{tid}/members */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ wid: string; tid: string }> },
) {
  const { wid, tid } = await ctx.params;
  return withOrg(request, wid, async () => {
    const [owned] = await db()
      .select({ id: team.id })
      .from(team)
      .where(and(eq(team.id, tid), eq(team.organizationId, wid)))
      .limit(1);
    if (!owned)
      return Response.json(
        { error: { message: "Team not found" } },
        { status: 404 },
      );

    const rows = await db()
      .select({
        id: teamMember.id,
        userId: teamMember.userId,
        role: teamMember.role,
        name: user.name,
        email: user.email,
      })
      .from(teamMember)
      .innerJoin(user, eq(user.id, teamMember.userId))
      .where(eq(teamMember.teamId, tid));

    return syncOk({
      members: rows.map((r) => ({
        id: r.id,
        user_id: r.userId,
        role: r.role,
        name: r.name,
        email: r.email,
      })),
    });
  });
}

/** POST .../members { user_id, role } — admin only. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ wid: string; tid: string }> },
) {
  const { wid, tid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const body = await request.json().catch(() => null);
    const parsed = teamMemberAddRequest.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: { message: "user_id is required" } },
        { status: 400 },
      );
    }

    const [owned] = await db()
      .select({ id: team.id })
      .from(team)
      .where(and(eq(team.id, tid), eq(team.organizationId, wid)))
      .limit(1);
    if (!owned)
      return Response.json(
        { error: { message: "Team not found" } },
        { status: 404 },
      );

    const [row] = await db()
      .insert(teamMember)
      .values({
        id: crypto.randomUUID(),
        teamId: tid,
        userId: parsed.data.user_id,
        role: parsed.data.role ?? "member",
      })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      return Response.json(
        { error: { message: "Already a member" } },
        { status: 409 },
      );
    }
    return syncCreated({ id: row.id, user_id: row.userId, role: row.role });
  });
}
