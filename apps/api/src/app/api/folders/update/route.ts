import { toCloudFolder } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { cloudFolder, folderUpdateRequest } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { folder } from "@repo/database/schema";

/** PATCH /api/folders/update — { id, name?, sort_order? }. */
export async function PATCH(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = folderUpdateRequest.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid update payload");
    }
    const { id, name, sort_order } = parsed.data;

    const [row] = await db()
      .update(folder)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(sort_order !== undefined ? { sortOrder: sort_order } : {}),
      })
      .where(and(eq(folder.id, id), eq(folder.userId, user.id)))
      .returning();

    if (!row) return syncError(404, "Folder not found");
    return syncOk(cloudFolder.parse(toCloudFolder(row)));
  });
}
