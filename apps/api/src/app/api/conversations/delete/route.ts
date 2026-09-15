import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { conversation } from "@repo/database/schema";
import { z } from "zod";

export async function DELETE(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = z.object({ id: z.string() }).safeParse(body);
    if (!parsed.success) return syncError(400, "id is required");

    const [row] = await db()
      .delete(conversation)
      .where(
        and(
          eq(conversation.id, parsed.data.id),
          eq(conversation.userId, user.id),
        ),
      )
      .returning({ id: conversation.id });

    if (!row) return syncError(404, "Conversation not found");
    return syncOk({ id: row.id });
  });
}
