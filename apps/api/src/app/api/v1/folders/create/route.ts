import {
  notFoundError,
  resolveWorkspaceSpace,
  toV1Folder,
  validationError,
} from "@/lib/v1";
import { withV1Key } from "@/lib/v1-auth";
import {
  v1Error,
  v1FolderCreateRequest,
  v1Ok,
} from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, count, eq } from "@repo/database";
import { folder } from "@repo/database/schema";

/**
 * POST /api/v1/folders/create — max 50 per user, 409 on duplicate name (the
 * (user_id, name) unique index backs this up).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = v1FolderCreateRequest.safeParse(body);

  return withV1Key(
    request,
    { personal: "notes:write", workspace: "workspace:folders:write" },
    async (auth) => {
      if (!parsed.success) return validationError("Invalid folder payload");
      const input = parsed.data;

      let organizationId: string | null = null;
      let spaceId: string | null = null;
      if (auth.kind === "personal") {
        if (input.space_id) {
          return validationError("space_id is not allowed for personal keys");
        }
      } else {
        if (!input.space_id) {
          return validationError("space_id is required for workspace keys");
        }
        const spaceRow = await resolveWorkspaceSpace(auth, input.space_id);
        if (!spaceRow) return notFoundError("Space not found");
        organizationId = auth.organizationId;
        spaceId = input.space_id;
      }

      const [{ value: total }] = await db()
        .select({ value: count() })
        .from(folder)
        .where(eq(folder.userId, auth.userId));
      if (total >= 50) {
        return v1Error(409, "conflict", "Folder limit reached (50)");
      }

      const [existing] = await db()
        .select({ id: folder.id })
        .from(folder)
        .where(and(eq(folder.userId, auth.userId), eq(folder.name, input.name)))
        .limit(1);
      if (existing) {
        return v1Error(
          409,
          "conflict",
          "A folder with this name already exists",
        );
      }

      const [row] = await db()
        .insert(folder)
        .values({
          id: crypto.randomUUID(),
          userId: auth.userId,
          organizationId,
          spaceId,
          name: input.name,
          sortOrder: input.sort_order ?? 0,
        })
        .returning();

      return v1Ok(toV1Folder(row), 201);
    },
  );
}
