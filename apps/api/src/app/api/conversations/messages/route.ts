import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import {
  cloudConversationMessage,
  conversationMessageCreateRequest,
  conversationMessagesRequest,
  conversationMessagesResponse,
} from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, asc, eq } from "@repo/database";
import { conversation, conversationMessage } from "@repo/database/schema";

/** GET /api/conversations/messages?conversation_id → { messages }. */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const url = new URL(request.url);
    const parsed = conversationMessagesRequest.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) return syncError(400, "conversation_id is required");

    const [owned] = await db()
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(
          eq(conversation.id, parsed.data.conversation_id),
          eq(conversation.userId, user.id),
        ),
      )
      .limit(1);
    if (!owned) return syncError(404, "Conversation not found");

    const rows = await db()
      .select()
      .from(conversationMessage)
      .where(eq(conversationMessage.conversationId, owned.id))
      .orderBy(asc(conversationMessage.createdAt));

    return syncOk(conversationMessagesResponse.parse({ messages: rows }));
  });
}

/** POST /api/conversations/messages — append one message. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = conversationMessageCreateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid message payload");

    const [owned] = await db()
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(
          eq(conversation.id, parsed.data.conversation_id),
          eq(conversation.userId, user.id),
        ),
      )
      .limit(1);
    if (!owned) return syncError(404, "Conversation not found");

    const [row] = await db()
      .insert(conversationMessage)
      .values({
        id: crypto.randomUUID(),
        conversationId: owned.id,
        role: parsed.data.role,
        content: parsed.data.content,
        metadata: parsed.data.metadata ?? null,
      })
      .returning();

    await db()
      .update(conversation)
      .set({ updatedAt: new Date() })
      .where(eq(conversation.id, owned.id));

    return syncOk(cloudConversationMessage.parse(row));
  });
}
