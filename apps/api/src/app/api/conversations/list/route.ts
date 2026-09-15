import { withSession } from "@/lib/session";
import { syncError, syncListQuery, syncOk } from "@repo/api-schemas/envelope";
import { conversationsListResponse } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, asc, desc, eq, gt, isNull, lt, or } from "@repo/database";
import { conversation } from "@repo/database/schema";

/** GET /api/conversations/list?limit&before&archived&include&since */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const url = new URL(request.url);
    const parsed = syncListQuery.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) return syncError(400, "Invalid list query");
    const q = parsed.data;
    const limit = Math.min(q.limit ?? 200, 9999);
    const archived = url.searchParams.get("archived");
    const include = url.searchParams.get("include");

    let keyset: ReturnType<typeof lt> | undefined;
    if (q.before) keyset = lt(conversation.updatedAt, new Date(q.before));
    else if (q.since) keyset = gt(conversation.updatedAt, new Date(q.since));

    const rows = await db()
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.userId, user.id),
          isNull(conversation.deletedAt),
          archived === "true"
            ? undefined
            : archived === "false"
              ? isNull(conversation.archivedAt)
              : undefined,
          keyset,
        ),
      )
      .orderBy(
        q.since ? asc(conversation.updatedAt) : desc(conversation.updatedAt),
      )
      .limit(limit);

    const conversations = rows.map((row) => ({
      ...row,
      archived_at: row.archivedAt ? row.archivedAt.toISOString() : null,
    }));

    void include;
    return syncOk(conversationsListResponse.parse({ conversations }));
  });
}
