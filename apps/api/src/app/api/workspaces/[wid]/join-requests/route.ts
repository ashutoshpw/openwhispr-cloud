import { withOrgAdmin } from "@/lib/org";
import { syncOk } from "@repo/api-schemas/envelope";
import { joinRequestsListResponse } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { joinRequest } from "@repo/database/schema";

/** GET /api/workspaces/{wid}/join-requests — pending requests, admin only. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const rows = await db()
      .select()
      .from(joinRequest)
      .where(eq(joinRequest.organizationId, wid));
    return syncOk(
      joinRequestsListResponse.parse({
        requests: rows.map((r) => ({
          id: r.id,
          workspace_id: r.organizationId,
          user_id: r.userId,
          status: r.status,
          created_at: r.createdAt.toISOString(),
        })),
      }),
    );
  });
}
