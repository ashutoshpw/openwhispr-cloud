import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { dictionaryEntry } from "@repo/database/schema";
import { z } from "zod";

const deleteRequest = z.object({ id: z.string() });

export async function DELETE(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = deleteRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "id is required");

    const [row] = await db()
      .delete(dictionaryEntry)
      .where(
        and(
          eq(dictionaryEntry.id, parsed.data.id),
          eq(dictionaryEntry.userId, user.id),
        ),
      )
      .returning({ id: dictionaryEntry.id });

    if (!row) return syncError(404, "Entry not found");
    return syncOk({ id: row.id });
  });
}
