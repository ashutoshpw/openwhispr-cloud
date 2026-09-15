import { withOrgAdmin } from "@/lib/org";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { member } from "@repo/database/schema";
import { z } from "zod";

/** PATCH /api/workspaces/{wid}/members/{uid} — { role }. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ wid: string; uid: string }> },
) {
  const { wid, uid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const body = await request.json().catch(() => null);
    const parsed = z.object({ role: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return syncError(400, "role is required");

    const [row] = await db()
      .update(member)
      .set({ role: parsed.data.role })
      .where(and(eq(member.organizationId, wid), eq(member.userId, uid)))
      .returning();
    if (!row) return syncError(404, "Member not found");
    return syncOk({ id: row.id, user_id: row.userId, role: row.role });
  });
}

/** DELETE /api/workspaces/{wid}/members/{uid} — remove a member. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ wid: string; uid: string }> },
) {
  const { wid, uid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const [row] = await db()
      .delete(member)
      .where(and(eq(member.organizationId, wid), eq(member.userId, uid)))
      .returning({ id: member.id });
    if (!row) return syncError(404, "Member not found");
    return syncOk({ removed: true });
  });
}
