import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { transcriptionInput } from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { transcription } from "@repo/database/schema";
import { z } from "zod";

const batchRequest = z.object({ transcriptions: z.array(transcriptionInput) });
type Created = {
  client_transcription_id: string;
  id: string;
  updated_at?: string;
};

export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = batchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid batch payload");

    const created: Created[] = [];
    for (const item of parsed.data.transcriptions) {
      if (item.client_transcription_id) {
        const [existing] = await db()
          .select()
          .from(transcription)
          .where(
            and(
              eq(transcription.userId, user.id),
              eq(
                transcription.clientTranscriptionId,
                item.client_transcription_id,
              ),
            ),
          )
          .limit(1);
        if (existing) {
          created.push({
            client_transcription_id: item.client_transcription_id,
            id: existing.id,
            updated_at: existing.updatedAt.toISOString(),
          });
          continue;
        }
      }

      const [row] = await db()
        .insert(transcription)
        .values({
          id: crypto.randomUUID(),
          clientTranscriptionId: item.client_transcription_id ?? null,
          userId: user.id,
          text: item.text,
          rawText: item.raw_text ?? null,
          provider: item.provider ?? null,
          model: item.model ?? null,
          language: item.language ?? null,
          audioDurationMs: item.audio_duration_ms ?? null,
          status: item.status ?? "completed",
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        })
        .returning();
      created.push({
        client_transcription_id: row.clientTranscriptionId ?? "",
        id: row.id,
        updated_at: row.updatedAt.toISOString(),
      });
    }

    return syncCreated({ created });
  });
}
