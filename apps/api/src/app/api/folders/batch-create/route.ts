import { toCloudFolder } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { folderInput } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { folder } from "@repo/database/schema";
import { z } from "zod";

const batchRequest = z.object({ folders: z.array(folderInput) });

/** POST /api/folders/batch-create → 201 { folders: [...] } (idempotent on client_folder_id). */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = batchRequest.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid batch payload");
    }

    const created = [];
    for (const item of parsed.data.folders) {
      if (item.client_folder_id) {
        const [existing] = await db()
          .select()
          .from(folder)
          .where(
            and(
              eq(folder.userId, user.id),
              eq(folder.clientFolderId, item.client_folder_id),
            ),
          )
          .limit(1);
        if (existing) {
          created.push(toCloudFolder(existing));
          continue;
        }
      }

      const [row] = await db()
        .insert(folder)
        .values({
          id: crypto.randomUUID(),
          clientFolderId: item.client_folder_id ?? null,
          userId: user.id,
          organizationId: item.workspace_id ?? null,
          spaceId: item.space_id ?? null,
          name: item.name,
          sortOrder: item.sort_order ?? 0,
        })
        .returning();
      created.push(toCloudFolder(row));
    }

    return syncCreated({ folders: created });
  });
}
