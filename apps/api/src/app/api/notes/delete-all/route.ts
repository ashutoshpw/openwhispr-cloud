import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";
import { noteDeleteAllResponse } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { note } from "@repo/database/schema";

/** DELETE /api/notes/delete-all → { deleted, errors } (hard delete). */
export async function DELETE(request: Request) {
  return withSession(request, async (user) => {
    const rows = await db()
      .delete(note)
      .where(and(eq(note.userId, user.id)))
      .returning({ id: note.id });

    return syncOk(
      noteDeleteAllResponse.parse({ deleted: rows.length, errors: 0 }),
    );
  });
}
