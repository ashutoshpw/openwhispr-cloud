import { generateText, streamText } from "ai";
import { defaultModel, getDefaultModel } from "./client";

export interface QueryMeta {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

/**
 * Run a one-shot prompt and return the full response text.
 * Uses streaming internally since OpenAI-compatible gateways often return SSE.
 */
export async function query(prompt: string, system?: string): Promise<string> {
  const { textStream } = streamText({
    model: defaultModel,
    ...(system ? { system } : {}),
    prompt,
  });
  let result = "";
  for await (const chunk of textStream) {
    result += chunk;
  }
  return result;
}

/**
 * Like `query`, but also returns token usage, latency, and model name.
 * Uses generateText (non-streaming) so usage data is available after completion.
 */
export async function queryWithMeta(
  prompt: string,
  system?: string,
): Promise<QueryMeta> {
  const start = Date.now();
  const result = await generateText({
    model: getDefaultModel(),
    ...(system ? { system } : {}),
    prompt,
  });
  const latencyMs = Date.now() - start;

  return {
    text: result.text,
    model: process.env.AI_DEFAULT_MODEL ?? "unknown",
    promptTokens: result.usage?.inputTokens ?? 0,
    completionTokens: result.usage?.outputTokens ?? 0,
    latencyMs,
  };
}

/**
 * Stream a prompt response, yielding text chunks as they arrive.
 */
export async function* stream(
  prompt: string,
  system?: string,
): AsyncGenerator<string> {
  const { textStream } = streamText({
    model: defaultModel,
    ...(system ? { system } : {}),
    prompt,
  });
  yield* textStream;
}
