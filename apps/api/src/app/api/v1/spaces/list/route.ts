import { toV1Space } from "@/lib/v1";
import { WORKSPACE_CONTENT_SCOPES, withV1Key } from "@/lib/v1-auth";
import { v1Ok } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, asc, eq } from "@repo/database";
import { space } from "@repo/database/schema";

/**
 * GET /api/v1/spaces/list — workspace keys only; any workspace content scope.
 * Returns the non-archived team spaces in the key's workspace.
 */
export async function GET(request: Request) {
  return withV1Key(
    request,
    { workspaceOnly: true, workspace: WORKSPACE_CONTENT_SCOPES },
    async (auth) => {
      const rows = await db()
        .select()
        .from(space)
        .where(
          and(
            eq(space.organizationId, auth.organizationId as string),
            eq(space.isArchived, false),
          ),
        )
        .orderBy(asc(space.createdAt));

      return v1Ok(rows.map(toV1Space));
    },
  );
}
