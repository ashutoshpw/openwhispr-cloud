import { withOrgAdmin } from "@/lib/org";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { space, spaceTeam } from "@repo/database/schema";

/** DELETE /api/spaces/{sid}/teams/{tid} */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ sid: string; tid: string }> },
) {
  const { sid, tid } = await ctx.params;
  const [sp] = await db()
    .select({ organizationId: space.organizationId })
    .from(space)
    .where(eq(space.id, sid))
    .limit(1);
  if (!sp)
    return Response.json(
      { error: { message: "Space not found" } },
      { status: 404 },
    );

  return withOrgAdmin(request, sp.organizationId, async () => {
    const [row] = await db()
      .delete(spaceTeam)
      .where(and(eq(spaceTeam.spaceId, sid), eq(spaceTeam.teamId, tid)))
      .returning({ id: spaceTeam.id });
    if (!row)
      return Response.json(
        { error: { message: "Grant not found" } },
        { status: 404 },
      );
    return syncOk({ removed: true });
  });
}
