import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq, isNull } from "@repo/database";
import { transcription } from "@repo/database/schema";
import { z } from "zod";

const deleteRequest = z.object({ id: z.string() });

export async function DELETE(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = deleteRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "id is required");

    const [row] = await db()
      .update(transcription)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(transcription.id, parsed.data.id),
          eq(transcription.userId, user.id),
          isNull(transcription.deletedAt),
        ),
      )
      .returning({ id: transcription.id });

    if (!row) return syncError(404, "Transcription not found");
    return syncOk({ id: row.id });
  });
}
