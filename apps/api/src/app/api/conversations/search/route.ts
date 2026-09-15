import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import {
  conversationSearchRequest,
  conversationSearchResponse,
} from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, desc, eq, isNull } from "@repo/database";
import { sql } from "@repo/database";
import { conversation } from "@repo/database/schema";

/** POST /api/conversations/search — FTS baseline over title. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = conversationSearchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid search payload");

    const rows = await db()
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.userId, user.id),
          isNull(conversation.deletedAt),
          sql`(${conversation.title} ILIKE ${`%${parsed.data.query}%`})`,
        ),
      )
      .orderBy(desc(conversation.updatedAt))
      .limit(parsed.data.limit ?? 20);

    return syncOk(conversationSearchResponse.parse({ conversations: rows }));
  });
}
