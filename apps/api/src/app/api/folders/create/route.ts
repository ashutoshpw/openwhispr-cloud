import { toCloudFolder } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { cloudFolder, folderInput } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, count, eq } from "@repo/database";
import { folder } from "@repo/database/schema";

/**
 * POST /api/folders/create — max 50 per user; 409 on duplicate name
 * (desktop contract, SKILL.md conflict semantics).
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = folderInput.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid folder payload");
    }
    const input = parsed.data;

    const [{ value: total }] = await db()
      .select({ value: count() })
      .from(folder)
      .where(eq(folder.userId, user.id));
    if (total >= 50) {
      return syncError(409, "Folder limit reached (50)", { code: "conflict" });
    }

    const [existing] = await db()
      .select({ id: folder.id })
      .from(folder)
      .where(and(eq(folder.userId, user.id), eq(folder.name, input.name)))
      .limit(1);
    if (existing) {
      return syncError(409, "A folder with this name already exists", {
        code: "conflict",
      });
    }

    const [row] = await db()
      .insert(folder)
      .values({
        id: crypto.randomUUID(),
        clientFolderId: input.client_folder_id ?? null,
        userId: user.id,
        organizationId: input.workspace_id ?? null,
        spaceId: input.space_id ?? null,
        name: input.name,
        sortOrder: input.sort_order ?? 0,
      })
      .returning();

    return syncCreated(cloudFolder.parse(toCloudFolder(row)));
  });
}
