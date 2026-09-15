import { withSession } from "@/lib/session";
import {
  countWords,
  getUsageSnapshot,
  limitReached,
  recordWordUsage,
} from "@/lib/usage";
import { syncError, syncOk } from "@repo/api-schemas/envelope";

/**
 * POST /api/transcribe — inline STT for the desktop client.
 *
 * The desktop pre-chunks long recordings (chunkedCloudTranscribe) and posts
 * each chunk here; the 4MB guard below is only a safety net for oversized
 * inline uploads (Vercel's platform cap produces a non-JSON 413 today).
 *
 * Response contract (interpretTranscribeResponse in the desktop):
 * { text, wordsUsed, wordsRemaining, plan, limitReached, sttProvider,
 *   sttModel, sttProcessingMs, sttWordCount, sttLanguage, audioDurationMs }
 */

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const STT_MODEL = "whisper-1";

function textPart(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === "string" && value.length ? value : null;
}

interface WhisperResult {
  text?: string;
  language?: string;
  duration?: number;
}

async function transcribeWhisper(
  file: File,
  language: string | null,
  prompt: string | null,
): Promise<WhisperResult | null> {
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const upstream = new FormData();
  upstream.append("file", file, file.name || "audio.webm");
  upstream.append("model", STT_MODEL);
  upstream.append("response_format", "verbose_json");
  if (language && language !== "auto") upstream.append("language", language);
  if (prompt) upstream.append("prompt", prompt);

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: upstream,
  });
  if (!response.ok) return null;
  return (await response.json()) as WhisperResult;
}

export async function POST(request: Request) {
  return withSession(request, async (user) => {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return syncError(400, "Invalid multipart form data");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return syncError(400, "Missing audio file");
    }
    if (file.size > MAX_FILE_BYTES) {
      return syncError(
        413,
        "Audio exceeds the 4MB inline limit; split the recording into chunks before uploading",
        { code: "PAYLOAD_TOO_LARGE" },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return syncError(503, "STT provider not configured");
    }

    const snapshot = await getUsageSnapshot(user.id);
    if (limitReached(snapshot)) {
      return syncError(429, "Word limit reached for the current period", {
        code: "LIMIT_REACHED",
      });
    }

    const language = textPart(form, "language");
    const prompt = textPart(form, "prompt");

    const startedAt = Date.now();
    let result: WhisperResult | null;
    try {
      result = await transcribeWhisper(file, language, prompt);
    } catch {
      result = null;
    }
    if (!result || typeof result.text !== "string") {
      return syncError(503, "Transcription provider request failed");
    }

    const text = result.text;
    if (!text.trim()) {
      return syncError(422, "No speech detected in audio", {
        code: "NO_SPEECH_DETECTED",
      });
    }

    const words = countWords(text);
    const sttProcessingMs = Date.now() - startedAt;
    await recordWordUsage(user.id, words);
    const after = await getUsageSnapshot(user.id);

    return syncOk({
      text,
      wordsUsed: after.wordsUsed,
      wordsRemaining: after.wordsRemaining,
      plan: after.plan,
      limitReached: limitReached(after),
      sttProvider: "openai-compatible",
      sttModel: STT_MODEL,
      sttProcessingMs,
      sttWordCount: words,
      sttLanguage:
        result.language ?? (language && language !== "auto" ? language : null),
      audioDurationMs:
        typeof result.duration === "number"
          ? Math.round(result.duration * 1000)
          : null,
    });
  });
}
