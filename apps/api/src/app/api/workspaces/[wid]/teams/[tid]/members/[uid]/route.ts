import { withOrgAdmin } from "@/lib/org";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { team, teamMember } from "@repo/database/schema";

/** DELETE /api/workspaces/{wid}/teams/{tid}/members/{uid} */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ wid: string; tid: string; uid: string }> },
) {
  const { wid, tid, uid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
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
      .delete(teamMember)
      .where(and(eq(teamMember.teamId, tid), eq(teamMember.userId, uid)))
      .returning({ id: teamMember.id });
    if (!row)
      return Response.json(
        { error: { message: "Member not found" } },
        { status: 404 },
      );
    return syncOk({ removed: true });
  });
}
