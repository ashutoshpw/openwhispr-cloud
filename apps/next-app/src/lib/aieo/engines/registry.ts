import type { AieoEngine } from "../types";
import { claudeEngine } from "./claude";
import { geminiEngine } from "./gemini";
import { googleAioEngine } from "./google-aio";
import { openaiEngine } from "./openai";
import { perplexityEngine } from "./perplexity";

const REGISTRY: Record<string, AieoEngine> = {
  perplexity: perplexityEngine,
  google_aio: googleAioEngine,
  openai: openaiEngine,
  gemini: geminiEngine,
  claude: claudeEngine,
};

export function getEngineAdapter(engineId: string): AieoEngine {
  const e = REGISTRY[engineId];
  if (!e) {
    throw new Error(`No AIEO engine adapter registered for id="${engineId}"`);
  }
  return e;
}

export function listRegisteredEngineIds(): string[] {
  return Object.keys(REGISTRY);
}
