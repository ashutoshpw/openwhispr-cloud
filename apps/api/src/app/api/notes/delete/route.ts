import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { noteDeleteRequest } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq, isNull } from "@repo/database";
import { note } from "@repo/database/schema";

/** DELETE /api/notes/delete — soft delete ({ id } body). */
export async function DELETE(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = noteDeleteRequest.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "id is required");
    }

    const [row] = await db()
      .update(note)
      .set({ deletedAt: new Date(), updatedByUserId: user.id })
      .where(
        and(
          eq(note.id, parsed.data.id),
          eq(note.userId, user.id),
          isNull(note.deletedAt),
        ),
      )
      .returning();

    if (!row) return syncError(404, "Note not found");
    return syncOk({ id: row.id });
  });
}
