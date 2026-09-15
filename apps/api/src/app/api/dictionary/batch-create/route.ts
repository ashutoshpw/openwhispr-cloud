import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { dictionaryEntryInput } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { dictionaryEntry } from "@repo/database/schema";
import { z } from "zod";

const batchRequest = z.object({ entries: z.array(dictionaryEntryInput) });

/** POST /api/dictionary/batch-create — idempotent on client_entry_id. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = batchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid batch payload");

    const created: { client_entry_id: string; id: string }[] = [];
    for (const item of parsed.data.entries) {
      if (item.client_entry_id) {
        const [existing] = await db()
          .select()
          .from(dictionaryEntry)
          .where(
            and(
              eq(dictionaryEntry.userId, user.id),
              eq(dictionaryEntry.clientEntryId, item.client_entry_id),
            ),
          )
          .limit(1);
        if (existing) {
          created.push({
            client_entry_id: item.client_entry_id,
            id: existing.id,
          });
          continue;
        }
      }

      const [row] = await db()
        .insert(dictionaryEntry)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          clientEntryId: item.client_entry_id ?? null,
          word: item.word,
          replacement: item.replacement ?? null,
        })
        .returning();
      created.push({ client_entry_id: row.clientEntryId ?? "", id: row.id });
    }

    return syncCreated({ created });
  });
}
