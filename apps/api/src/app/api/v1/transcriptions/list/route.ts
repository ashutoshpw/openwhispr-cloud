import {
  decodeTimestampCursor,
  encodeTimestampCursor,
  toV1Transcription,
  validationError,
} from "@/lib/v1";
import { withV1Key } from "@/lib/v1-auth";
import { v1List, v1ListQuery } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, desc, eq, gt, isNull } from "@repo/database";
import { transcription } from "@repo/database/schema";

/**
 * GET /api/v1/transcriptions/list — newest first; the cursor is a timestamp
 * (base64url-encoded ISO, legacy raw ISO accepted). Personal keys only.
 */
export async function GET(request: Request) {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = v1ListQuery.safeParse(query);

  return withV1Key(
    request,
    { personalOnly: true, personal: "transcriptions:read" },
    async (auth) => {
      if (!parsed.success) return validationError("Invalid query parameters");
      const q = parsed.data;

      let cursor: Date | null = null;
      if (q.cursor) {
        cursor = decodeTimestampCursor(q.cursor);
        if (!cursor) return validationError("Invalid cursor");
      }

      const rows = await db()
        .select()
        .from(transcription)
        .where(
          and(
            eq(transcription.userId, auth.userId),
            isNull(transcription.deletedAt),
            cursor ? gt(transcription.createdAt, cursor) : undefined,
          ),
        )
        .orderBy(desc(transcription.createdAt))
        .limit(q.limit + 1);

      const hasMore = rows.length > q.limit;
      const page = rows.slice(0, q.limit);

      return v1List(page.map(toV1Transcription), {
        hasMore,
        nextCursor: hasMore
          ? encodeTimestampCursor(page[page.length - 1].createdAt)
          : null,
      });
    },
  );
}
