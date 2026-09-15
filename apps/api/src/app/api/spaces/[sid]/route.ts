import { withOrgAdmin } from "@/lib/org";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { space } from "@repo/database/schema";
import { z } from "zod";

const patchRequest = z.object({
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().nullish(),
  description: z.string().nullish(),
  is_archived: z.boolean().optional(),
});

async function orgIdForSpace(sid: string): Promise<string | null> {
  const [row] = await db()
    .select({ organizationId: space.organizationId })
    .from(space)
    .where(eq(space.id, sid))
    .limit(1);
  return row?.organizationId ?? null;
}

/** PATCH /api/spaces/{sid} — workspace admin only. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const wid = await orgIdForSpace(sid);
  if (!wid) return syncError(404, "Space not found");
  return withOrgAdmin(request, wid, async () => {
    const body = await request.json().catch(() => null);
    const parsed = patchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid payload");

    const [row] = await db()
      .update(space)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.emoji !== undefined
          ? { emoji: parsed.data.emoji }
          : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.is_archived !== undefined
          ? { isArchived: parsed.data.is_archived }
          : {}),
      })
      .where(eq(space.id, sid))
      .returning();
    return syncOk(row);
  });
}

/** DELETE /api/spaces/{sid} — soft archive (desktop DELETE returns ok). */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const wid = await orgIdForSpace(sid);
  if (!wid) return syncError(404, "Space not found");
  return withOrgAdmin(request, wid, async () => {
    await db().update(space).set({ isArchived: true }).where(eq(space.id, sid));
    return syncOk({ id: sid, deleted: true });
  });
}
