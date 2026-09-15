import { withOrg } from "@/lib/org";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { member, user } from "@repo/database/schema";

/** GET /api/workspaces/{wid}/members */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrg(request, wid, async () => {
    const rows = await db()
      .select({
        id: member.id,
        userId: member.userId,
        role: member.role,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, wid));

    return syncOk({
      members: rows.map((r) => ({
        id: r.id,
        user_id: r.userId,
        email: r.email,
        name: r.name,
        image: r.image,
        role: r.role,
        created_at: r.createdAt.toISOString(),
      })),
    });
  });
}
