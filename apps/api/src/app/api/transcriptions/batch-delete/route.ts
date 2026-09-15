import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { transcriptionBatchDeleteResponse } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, eq, inArray } from "@repo/database";
import { transcription } from "@repo/database/schema";
import { z } from "zod";

const batchDeleteRequest = z.object({ ids: z.array(z.string()).min(1) });

export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = batchDeleteRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "ids is required");

    const rows = await db()
      .update(transcription)
      .set({ deletedAt: new Date() })
      .where(
        and(
          inArray(transcription.id, parsed.data.ids),
          eq(transcription.userId, user.id),
        ),
      )
      .returning({ id: transcription.id });

    return syncOk(
      transcriptionBatchDeleteResponse.parse({ deleted: rows.length }),
    );
  });
}
