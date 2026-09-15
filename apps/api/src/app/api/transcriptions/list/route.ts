import { withSession } from "@/lib/session";
import { syncError, syncListQuery, syncOk } from "@repo/api-schemas/envelope";
import { transcriptionsListResponse } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, asc, desc, eq, gt, isNull, lt, or } from "@repo/database";
import { transcription } from "@repo/database/schema";

/** GET /api/transcriptions/list?limit&before&since → { transcriptions } */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const url = new URL(request.url);
    const parsed = syncListQuery.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) return syncError(400, "Invalid list query");
    const q = parsed.data;
    const limit = Math.min(q.limit ?? 200, 9999);

    let keyset: ReturnType<typeof lt> | undefined;
    if (q.before) keyset = lt(transcription.createdAt, new Date(q.before));
    else if (q.since) keyset = gt(transcription.createdAt, new Date(q.since));

    const rows = await db()
      .select()
      .from(transcription)
      .where(
        and(
          eq(transcription.userId, user.id),
          isNull(transcription.deletedAt),
          keyset,
        ),
      )
      .orderBy(
        q.since ? asc(transcription.createdAt) : desc(transcription.createdAt),
      )
      .limit(limit);

    return syncOk(transcriptionsListResponse.parse({ transcriptions: rows }));
  });
}
