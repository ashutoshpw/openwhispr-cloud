import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { dictionaryEntry } from "@repo/database/schema";
import { z } from "zod";

const updateRequest = z.object({
  id: z.string(),
  word: z.string().min(1).optional(),
  replacement: z.string().nullish(),
});

/** PATCH /api/dictionary/update — { id, word?, replacement? }. */
export async function PATCH(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = updateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid update payload");
    const { id, ...updates } = parsed.data;

    const [row] = await db()
      .update(dictionaryEntry)
      .set({
        ...(updates.word !== undefined ? { word: updates.word } : {}),
        ...(updates.replacement !== undefined
          ? { replacement: updates.replacement }
          : {}),
      })
      .where(
        and(eq(dictionaryEntry.id, id), eq(dictionaryEntry.userId, user.id)),
      )
      .returning();

    if (!row) return syncError(404, "Entry not found");
    return syncOk(row);
  });
}
