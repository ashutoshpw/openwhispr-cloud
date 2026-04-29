/**
 * Uniform AIEO engine interface. Every adapter (Perplexity, Google AIO,
 * OpenAI, Gemini, Claude) implements the same `query()` shape so the
 * snapshot cron is engine-agnostic.
 */

export interface AieoCitation {
  url: string;
  domain: string;
  title?: string;
}

export interface AieoQueryInput {
  prompt: string;
  /** Domain we're tracking, e.g. "example.com" */
  targetDomain: string;
  /** Competitor domains to look for in the answer text */
  competitors: string[];
  /** Optional model override (defaults to engine row's modelId) */
  modelId?: string;
  /** API credential resolved by caller */
  apiKey: string;
}

export interface AieoQueryResult {
  brandMentioned: boolean;
  /** 1-indexed position of first brand mention in the answer text */
  mentionRank: number | null;
  /** Pre-classified locally (heuristic). Re-classify via sentiment.ts if a model is configured. */
  sentiment: "positive" | "neutral" | "negative";
  competitorsMentioned: string[];
  citations: AieoCitation[];
  ourCitationUrl: string | null;
  rawAnswer: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
}

export interface AieoEngine {
  id: string;
  query(input: AieoQueryInput): Promise<AieoQueryResult>;
}
