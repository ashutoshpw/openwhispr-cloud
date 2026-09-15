import { withOrgAdmin } from "@/lib/org";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { spaceTeamAddRequest } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { space, spaceTeam } from "@repo/database/schema";

/** POST /api/spaces/{sid}/teams { team_id, access } — admin only. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const [sp] = await db()
    .select({ organizationId: space.organizationId })
    .from(space)
    .where(eq(space.id, sid))
    .limit(1);
  if (!sp) return syncError(404, "Space not found");

  return withOrgAdmin(request, sp.organizationId, async () => {
    const body = await request.json().catch(() => null);
    const parsed = spaceTeamAddRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "team_id is required");

    const [row] = await db()
      .insert(spaceTeam)
      .values({
        id: crypto.randomUUID(),
        spaceId: sid,
        teamId: parsed.data.team_id,
        access: parsed.data.access,
      })
      .onConflictDoNothing()
      .returning();
    if (!row) return syncError(409, "Team already has access");
    return syncCreated({ id: row.id, team_id: row.teamId, access: row.access });
  });
}
