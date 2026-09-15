import { toCloudFolder } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncListQuery, syncOk } from "@repo/api-schemas/envelope";
import { foldersListResponse } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { asc, eq } from "@repo/database";
import { folder } from "@repo/database/schema";

/** GET /api/folders/list → { folders } sorted by sort_order then created_at. */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    void syncListQuery;
    const rows = await db()
      .select()
      .from(folder)
      .where(eq(folder.userId, user.id))
      .orderBy(asc(folder.sortOrder), asc(folder.createdAt));

    return syncOk(
      foldersListResponse.parse({ folders: rows.map(toCloudFolder) }),
    );
  });
}
