import {
  notFoundError,
  resolveWorkspaceSpace,
  toV1Folder,
  validationError,
} from "@/lib/v1";
import { withV1Key } from "@/lib/v1-auth";
import { v1List, v1ListQuery } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, asc, eq, isNull } from "@repo/database";
import { folder } from "@repo/database/schema";

/**
 * GET /api/v1/folders/list — sorted by sort_order then created_at. Workspace
 * keys must pass a space_id; personal keys list their private folders.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const parsed = v1ListQuery.safeParse(params);
  const requestedSpaceId = url.searchParams.get("space_id");

  return withV1Key(
    request,
    { personal: "notes:read", workspace: "workspace:folders:read" },
    async (auth) => {
      if (!parsed.success) return validationError("Invalid query parameters");

      let spaceId: string | null = null;
      if (auth.kind === "personal") {
        if (requestedSpaceId) {
          return validationError("space_id is not allowed for personal keys");
        }
      } else {
        if (!requestedSpaceId) {
          return validationError("space_id is required for workspace keys");
        }
        const spaceRow = await resolveWorkspaceSpace(auth, requestedSpaceId);
        if (!spaceRow) return notFoundError("Space not found");
        spaceId = requestedSpaceId;
      }

      const scopeFilter =
        auth.kind === "workspace"
          ? and(
              eq(folder.organizationId, auth.organizationId as string),
              eq(folder.spaceId, spaceId as string),
            )
          : and(eq(folder.userId, auth.userId), isNull(folder.organizationId));

      const rows = await db()
        .select()
        .from(folder)
        .where(scopeFilter)
        .orderBy(asc(folder.sortOrder), asc(folder.createdAt));

      return v1List(rows.map(toV1Folder), { hasMore: false });
    },
  );
}
