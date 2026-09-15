import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { snippet } from "@repo/database/schema";
import { z } from "zod";

const updateRequest = z.object({
  id: z.string(),
  trigger: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

/** PATCH /api/snippets/update — { id, word?, replacement? }. */
export async function PATCH(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = updateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid update payload");
    const { id, ...updates } = parsed.data;

    const [row] = await db()
      .update(snippet)
      .set({
        ...(updates.trigger !== undefined ? { trigger: updates.trigger } : {}),
        ...(updates.content !== undefined ? { content: updates.content } : {}),
      })
      .where(and(eq(snippet.id, id), eq(snippet.userId, user.id)))
      .returning();

    if (!row) return syncError(404, "Snippet not found");
    return syncOk(row);
  });
}
