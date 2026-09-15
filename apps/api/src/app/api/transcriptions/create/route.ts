import { withSession } from "@/lib/session";
import { syncCreated, syncError, syncOk } from "@repo/api-schemas/envelope";
import {
  cloudTranscription,
  transcriptionInput,
} from "@repo/api-schemas/sync/content";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { transcription } from "@repo/database/schema";

export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = transcriptionInput.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid transcription payload");
    }
    const input = parsed.data;

    if (input.client_transcription_id) {
      const [existing] = await db()
        .select()
        .from(transcription)
        .where(
          and(
            eq(transcription.userId, user.id),
            eq(
              transcription.clientTranscriptionId,
              input.client_transcription_id,
            ),
          ),
        )
        .limit(1);
      if (existing) return syncOk(existing);
    }

    const [row] = await db()
      .insert(transcription)
      .values({
        id: crypto.randomUUID(),
        clientTranscriptionId: input.client_transcription_id ?? null,
        userId: user.id,
        text: input.text,
        rawText: input.raw_text ?? null,
        provider: input.provider ?? null,
        model: input.model ?? null,
        language: input.language ?? null,
        audioDurationMs: input.audio_duration_ms ?? null,
        status: input.status ?? "completed",
        createdAt: input.created_at ? new Date(input.created_at) : new Date(),
      })
      .returning();

    return syncCreated(row);
  });
}
