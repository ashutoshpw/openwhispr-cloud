import { toCloudNote } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import {
  noteSearchRequest,
  noteSearchResponse,
} from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, desc, eq, isNull, sql } from "@repo/database";
import { note } from "@repo/database/schema";

/**
 * POST /api/notes/search
 * Body { query, limit?, scope?, space_id? }. scope "all" opts into space
 * results; space_id narrows to a single space and takes precedence.
 *
 * Semantic ranking arrives with the Qdrant/vector work; this implementation
 * provides the contract-shaped Postgres FTS path so the desktop works today.
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = noteSearchRequest.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid search payload");
    }
    const { query, limit, scope, space_id } = parsed.data;

    const rows = await db()
      .select()
      .from(note)
      .where(
        and(
          eq(note.userId, user.id),
          isNull(note.deletedAt),
          space_id
            ? eq(note.spaceId, space_id)
            : scope === "all"
              ? undefined
              : isNull(note.spaceId),
          sql`(${note.title} ILIKE ${`%${query}%`} OR ${note.content} ILIKE ${`%${query}%`} OR ${note.transcript} ILIKE ${`%${query}%`})`,
        ),
      )
      .orderBy(desc(note.updatedAt))
      .limit(limit ?? 20);

    // Relevance scoring is refined when vector search lands; position in the
    // recency-ordered result is the baseline score.
    const notes = rows.map((row, index) => ({
      ...toCloudNote(row),
      score: Math.max(0, 1 - index * 0.05),
    }));

    return syncOk({ notes });
  });
}
