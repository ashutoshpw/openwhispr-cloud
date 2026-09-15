import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import {
  cloudConversation,
  conversationInput,
} from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { conversation, conversationMessage } from "@repo/database/schema";

/** POST /api/conversations/create — accepts inline messages. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = conversationInput.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid conversation payload");
    const input = parsed.data;

    if (input.client_conversation_id) {
      const [existing] = await db()
        .select()
        .from(conversation)
        .where(
          and(
            eq(conversation.userId, user.id),
            eq(conversation.clientConversationId, input.client_conversation_id),
          ),
        )
        .limit(1);
      if (existing) return syncCreated(existing);
    }

    const now = new Date();
    const [row] = await db()
      .insert(conversation)
      .values({
        id: crypto.randomUUID(),
        clientConversationId: input.client_conversation_id ?? null,
        userId: user.id,
        title: input.title ?? null,
        createdAt: input.created_at ? new Date(input.created_at) : now,
        updatedAt: input.updated_at ? new Date(input.updated_at) : now,
      })
      .returning();

    if (input.messages?.length) {
      await db()
        .insert(conversationMessage)
        .values(
          input.messages.map((m) => ({
            id: crypto.randomUUID(),
            conversationId: row.id,
            role: m.role,
            content: m.content,
            metadata: m.metadata ?? null,
          })),
        );
    }

    return syncCreated(cloudConversation.parse({ ...row, messages: null }));
  });
}
