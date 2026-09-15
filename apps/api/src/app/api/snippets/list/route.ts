import { withSession } from "@/lib/session";
import { syncError, syncListQuery, syncOk } from "@repo/api-schemas/envelope";
import { entryListResponse } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, asc, eq, gt, or } from "@repo/database";
import { snippet } from "@repo/database/schema";

/** GET /api/PATH/list?cursor&cursor_id&limit -> { entries, hasMore } */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const url = new URL(request.url);
    const parsed = syncListQuery.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) return syncError(400, "Invalid list query");
    const q = parsed.data;
    const limit = Math.min(q.limit ?? 200, 999);

    const keyset =
      q.cursor && q.cursor_id
        ? or(
            gt(snippet.createdAt, new Date(q.cursor)),
            and(
              eq(snippet.createdAt, new Date(q.cursor)),
              gt(snippet.id, q.cursor_id),
            ),
          )
        : undefined;

    const rows = await db()
      .select()
      .from(snippet)
      .where(and(eq(snippet.userId, user.id), keyset))
      .orderBy(asc(snippet.createdAt), asc(snippet.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;

    return syncOk(entryListResponse.parse({ entries, hasMore }));
  });
}
