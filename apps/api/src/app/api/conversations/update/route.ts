import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { conversationUpdateRequest } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { conversation } from "@repo/database/schema";

/** PATCH /api/conversations/update — { id, title?, archived_at? }. */
export async function PATCH(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = conversationUpdateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid update payload");
    const { id, title, archived_at } = parsed.data;

    const [row] = await db()
      .update(conversation)
      .set({
        ...(title !== undefined ? { title } : {}),
        ...(archived_at !== undefined
          ? { archivedAt: archived_at ? new Date(archived_at) : null }
          : {}),
      })
      .where(and(eq(conversation.id, id), eq(conversation.userId, user.id)))
      .returning();

    if (!row) return syncError(404, "Conversation not found");
    return syncOk(row);
  });
}
