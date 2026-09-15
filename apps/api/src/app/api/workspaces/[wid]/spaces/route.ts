import { withOrgAdmin } from "@/lib/org";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { spaceCreateRequest } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { space, spaceMember, spaceTeam } from "@repo/database/schema";

/** POST /api/workspaces/{wid}/spaces — admin only. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = spaceCreateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid space payload");
    const input = parsed.data;

    const [row] = await db()
      .insert(space)
      .values({
        id: crypto.randomUUID(),
        organizationId: wid,
        name: input.name,
        slug: `${input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`,
        emoji: input.emoji ?? null,
        description: input.description ?? null,
        createdByUserId: user.id,
      })
      .returning();

    if (input.member_ids.length || input.team_ids.length) {
      if (input.member_ids.length) {
        await db()
          .insert(spaceMember)
          .values(
            input.member_ids.map((uid) => ({
              id: crypto.randomUUID(),
              spaceId: row.id,
              userId: uid,
              role: "member",
            })),
          );
      }
      if (input.team_ids.length) {
        await db()
          .insert(spaceTeam)
          .values(
            input.team_ids.map((tid) => ({
              id: crypto.randomUUID(),
              spaceId: row.id,
              teamId: tid,
              access: "read",
            })),
          );
      }
    }

    return syncCreated({
      id: row.id,
      organization_id: row.organizationId,
      name: row.name,
      slug: row.slug,
      emoji: row.emoji,
      description: row.description,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    });
  });
}
