import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { snippetInput } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { snippet } from "@repo/database/schema";
import { z } from "zod";

const batchRequest = z.object({ entries: z.array(snippetInput) });

/** POST /api/snippets/batch-create — idempotent on client_snippet_id. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = batchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid batch payload");

    const created: { client_snippet_id: string; id: string }[] = [];
    for (const item of parsed.data.entries) {
      if (item.client_snippet_id) {
        const [existing] = await db()
          .select()
          .from(snippet)
          .where(
            and(
              eq(snippet.userId, user.id),
              eq(snippet.clientEntryId, item.client_snippet_id),
            ),
          )
          .limit(1);
        if (existing) {
          created.push({
            client_snippet_id: item.client_snippet_id,
            id: existing.id,
          });
          continue;
        }
      }

      const [row] = await db()
        .insert(snippet)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          clientEntryId: item.client_snippet_id ?? null,
          trigger: item.trigger,
          content: item.content,
        })
        .returning();
      created.push({ client_snippet_id: row.clientEntryId ?? "", id: row.id });
    }

    return syncCreated({ created });
  });
}
