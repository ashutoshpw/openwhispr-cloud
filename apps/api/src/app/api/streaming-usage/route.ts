import { withSession } from "@/lib/session";
import { countWords, recordWordUsage } from "@/lib/usage";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { z } from "zod";

/**
 * POST /api/streaming-usage — word accounting for streaming dictation.
 *
 * The desktop reports finalized streaming transcripts here; words come from
 * analyticsWordCount when reported, else from the whitespace-split text.
 */

const payloadSchema = z.object({
  text: z.string().default(""),
  audioDurationSeconds: z.number().optional(),
  sessionId: z.string().optional(),
  clientType: z.string().optional(),
  appVersion: z.string().optional(),
  clientVersion: z.string().optional(),
  sttProvider: z.string().optional(),
  sttModel: z.string().optional(),
  sttProcessingMs: z.number().optional(),
  sttLanguage: z.string().optional(),
  audioSizeBytes: z.number().optional(),
  audioFormat: z.string().optional(),
  clientTotalMs: z.number().optional(),
  sendLogs: z.boolean().optional(),
  clientTranscriptionId: z.string().optional(),
  localDate: z.string().optional(),
  analyticsOccurredAt: z.string().optional(),
  analyticsWordCount: z.number().int().optional(),
  analyticsCounterVersion: z.number().int().optional(),
});

export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid usage payload");
    }
    const input = parsed.data;
    const words = input.analyticsWordCount ?? countWords(input.text);
    await recordWordUsage(user.id, words);
    return syncOk({ ok: true });
  });
}
