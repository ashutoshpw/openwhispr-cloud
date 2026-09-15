import { withSession } from "@/lib/session";
import { query } from "@repo/ai";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { z } from "zod";

/**
 * POST /api/reason — one-shot LLM cleanup for dictated text (cloud-reason).
 *
 * The desktop sends the transcript plus optional dictionary/prompt overrides
 * and reads back { text, model, provider, promptMode, matchType,
 * screenContextApplied }.
 */

const DEFAULT_CLEANUP_SYSTEM_PROMPT = [
  "You clean up dictated text.",
  "Fix grammar, punctuation, and casing while preserving the speaker's meaning, tone, and language.",
  "Never answer questions, translate, or add commentary; return only the cleaned text.",
].join(" ");

const reasonSchema = z.object({
  text: z.string(),
  model: z.string().optional(),
  agentName: z.string().optional(),
  customDictionary: z.union([z.array(z.string()), z.string()]).optional(),
  customPrompt: z.string().optional(),
  systemPrompt: z.string().optional(),
  requestPurpose: z.string().optional(),
  promptMode: z.string().optional(),
  purpose: z.string().optional(),
  screenContext: z.unknown().optional(),
  language: z.string().optional(),
  locale: z.string().optional(),
  sessionId: z.string().optional(),
  clientType: z.string().optional(),
  appVersion: z.string().optional(),
  clientVersion: z.string().optional(),
  sttProvider: z.string().optional(),
  sttModel: z.string().optional(),
  sttProcessingMs: z.number().optional(),
  sttWordCount: z.number().optional(),
  sttLanguage: z.string().optional(),
  audioDurationMs: z.number().optional(),
  audioSizeBytes: z.number().optional(),
  audioFormat: z.string().optional(),
  clientTotalMs: z.number().optional(),
});

type ReasonInput = z.infer<typeof reasonSchema>;

function normalizeDictionary(
  customDictionary: ReasonInput["customDictionary"],
): string[] {
  if (!customDictionary) return [];
  const parts = Array.isArray(customDictionary)
    ? customDictionary
    : customDictionary.split(/[,\n]/);
  return parts.map((word) => word.trim()).filter(Boolean);
}

function buildSystemPrompt(input: ReasonInput): string {
  const system = input.systemPrompt?.trim() || DEFAULT_CLEANUP_SYSTEM_PROMPT;
  const extras: string[] = [];

  const words = normalizeDictionary(input.customDictionary);
  if (words.length) {
    extras.push(`Preferred spellings: ${words.join(", ")}.`);
  }
  if (input.customPrompt?.trim()) {
    extras.push(input.customPrompt.trim());
  }
  const purpose = input.requestPurpose ?? input.purpose;
  if (purpose?.trim()) {
    extras.push(`Purpose: ${purpose.trim()}.`);
  }
  if (input.promptMode && input.promptMode !== "cleanup") {
    extras.push(`Mode: ${input.promptMode}.`);
  }
  return extras.length ? `${system}\n${extras.join(" ")}` : system;
}

function inferenceConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.AI_DEFAULT_MODEL);
}

export async function POST(request: Request) {
  return withSession(request, async () => {
    const body = await request.json().catch(() => null);
    const parsed = reasonSchema.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid reason payload");
    }
    const input = parsed.data;

    if (!inferenceConfigured()) {
      return syncError(503, "Inference provider not configured");
    }

    let text: string;
    try {
      text = await query(input.text, buildSystemPrompt(input));
    } catch {
      return syncError(503, "Inference request failed");
    }

    return syncOk({
      text,
      model: input.model ?? process.env.AI_DEFAULT_MODEL ?? null,
      provider: "openai-compatible",
      promptMode: input.promptMode ?? "cleanup",
      matchType: "exact",
      screenContextApplied: Boolean(input.screenContext),
    });
  });
}
