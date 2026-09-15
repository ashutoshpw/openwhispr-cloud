import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { folderDeleteRequest } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { folder } from "@repo/database/schema";

/** DELETE /api/folders/delete — { id } body; notes keep their folder_id cleared. */
export async function DELETE(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = folderDeleteRequest.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "id is required");
    }

    const [row] = await db()
      .delete(folder)
      .where(and(eq(folder.id, parsed.data.id), eq(folder.userId, user.id)))
      .returning({ id: folder.id });

    if (!row) return syncError(404, "Folder not found");
    return syncOk({ id: row.id });
  });
}
