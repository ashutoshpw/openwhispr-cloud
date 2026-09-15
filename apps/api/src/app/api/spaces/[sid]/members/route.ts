import { withOrg, withOrgAdmin } from "@/lib/org";
import { syncCreated, syncError, syncOk } from "@repo/api-schemas/envelope";
import {
  spaceMemberAddRequest,
  spaceMemberRoleUpdateRequest,
} from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { space, spaceMember, user } from "@repo/database/schema";

async function orgIdForSpace(sid: string): Promise<string | null> {
  const [row] = await db()
    .select({ organizationId: space.organizationId })
    .from(space)
    .where(eq(space.id, sid))
    .limit(1);
  return row?.organizationId ?? null;
}

/** GET /api/spaces/{sid}/members */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const wid = await orgIdForSpace(sid);
  if (!wid) return syncError(404, "Space not found");
  return withOrg(request, wid, async () => {
    const rows = await db()
      .select({
        id: spaceMember.id,
        userId: spaceMember.userId,
        role: spaceMember.role,
        name: user.name,
        email: user.email,
      })
      .from(spaceMember)
      .innerJoin(user, eq(user.id, spaceMember.userId))
      .where(eq(spaceMember.spaceId, sid));
    return syncOk({ members: rows });
  });
}

/** POST /api/spaces/{sid}/members { user_id, role } — admin only. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const wid = await orgIdForSpace(sid);
  if (!wid) return syncError(404, "Space not found");
  return withOrgAdmin(request, wid, async () => {
    const body = await request.json().catch(() => null);
    const parsed = spaceMemberAddRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "user_id is required");

    const [row] = await db()
      .insert(spaceMember)
      .values({
        id: crypto.randomUUID(),
        spaceId: sid,
        userId: parsed.data.user_id,
        role: parsed.data.role,
      })
      .onConflictDoNothing()
      .returning();
    if (!row) return syncError(409, "Already a member");
    return syncCreated({ id: row.id, user_id: row.userId, role: row.role });
  });
}

/** PATCH /api/spaces/{sid}/members/{uid} — { role }. */
export async function PATCH(request: Request) {
  void spaceMemberRoleUpdateRequest;
  return syncError(405, "Use /members/{uid}");
}
