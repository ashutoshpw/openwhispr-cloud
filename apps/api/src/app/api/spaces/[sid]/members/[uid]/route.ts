import { withOrgAdmin } from "@/lib/org";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { spaceMemberRemoveResponse } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq, inArray } from "@repo/database";
import {
  space,
  spaceMember,
  spaceTeam,
  teamMember,
} from "@repo/database/schema";
import { z } from "zod";

/**
 * DELETE /api/spaces/{sid}/members/{uid} → { removed, still_via_teams }.
 * The user may still hold access through a team grant; the response reports it.
 */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ sid: string; uid: string }> },
) {
  const { sid, uid } = await ctx.params;
  const [sp] = await db()
    .select({ organizationId: space.organizationId })
    .from(space)
    .where(eq(space.id, sid))
    .limit(1);
  if (!sp) return syncError(404, "Space not found");

  return withOrgAdmin(request, sp.organizationId, async () => {
    const [row] = await db()
      .delete(spaceMember)
      .where(and(eq(spaceMember.spaceId, sid), eq(spaceMember.userId, uid)))
      .returning({ id: spaceMember.id });

    // Check team-based access that remains
    const teamGrants = await db()
      .select({ teamId: spaceTeam.teamId })
      .from(spaceTeam)
      .where(eq(spaceTeam.spaceId, sid));
    let stillViaTeams = false;
    if (teamGrants.length > 0) {
      const userTeams = await db()
        .select({ teamId: teamMember.teamId })
        .from(teamMember)
        .where(
          and(
            eq(teamMember.userId, uid),
            inArray(
              teamMember.teamId,
              teamGrants.map((g) => g.teamId),
            ),
          ),
        )
        .limit(1);
      stillViaTeams = userTeams.length > 0;
    }

    return syncOk(
      spaceMemberRemoveResponse.parse({
        removed: !!row,
        still_via_teams: stillViaTeams,
      }),
    );
  });
}
