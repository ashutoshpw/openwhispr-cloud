import { withOrgAdmin } from "@/lib/org";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { team } from "@repo/database/schema";

/** DELETE /api/workspaces/{wid}/teams/{tid} */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ wid: string; tid: string }> },
) {
  const { wid, tid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const [row] = await db()
      .delete(team)
      .where(and(eq(team.id, tid), eq(team.organizationId, wid)))
      .returning({ id: team.id });
    if (!row)
      return Response.json(
        { error: { message: "Team not found" } },
        { status: 404 },
      );
    return syncOk({ id: row.id, deleted: true });
  });
}
