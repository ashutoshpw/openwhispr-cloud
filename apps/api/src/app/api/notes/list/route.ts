import { keysetFilter, toCloudNote } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncError, syncListQuery, syncOk } from "@repo/api-schemas/envelope";
import { notesListResponse } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, desc, eq, isNull } from "@repo/database";
import { note } from "@repo/database/schema";

export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const url = new URL(request.url);
    const parsed = syncListQuery.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return syncError(400, "Invalid list query");
    }
    const q = parsed.data;
    const limit = Math.min(q.limit ?? 200, 9999);

    const where = and(
      eq(note.userId, user.id),
      isNull(note.deletedAt),
      keysetFilter(note.updatedAt, note.id, q),
    );

    const rows = await db()
      .select()
      .from(note)
      .where(where)
      .orderBy(desc(note.updatedAt), desc(note.id))
      .limit(limit);

    const body = notesListResponse.parse({ notes: rows.map(toCloudNote) });
    return syncOk(body);
  });
}
