/**
 * Google Gemini adapter using generateContent + google_search grounding.
 */

import {
  competitorsFromAnswer,
  findBrandMention,
  findOurCitation,
  heuristicSentiment,
  urlToCitation,
} from "../parse";
import type {
  AieoCitation,
  AieoEngine,
  AieoQueryInput,
  AieoQueryResult,
} from "../types";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

const DEFAULT_MODEL = "gemini-2.5-pro";

export const geminiEngine: AieoEngine = {
  id: "gemini",
  async query(input: AieoQueryInput): Promise<AieoQueryResult> {
    const model = input.modelId || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        tools: [{ google_search: {} }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const cand = data.candidates?.[0];
    const rawAnswer =
      cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

    const citations: AieoCitation[] = [];
    for (const chunk of cand?.groundingMetadata?.groundingChunks ?? []) {
      if (!chunk.web?.uri) continue;
      const c = urlToCitation(chunk.web.uri, chunk.web.title);
      if (c) citations.push(c);
    }

    const mention = findBrandMention(rawAnswer, input.targetDomain);

    return {
      brandMentioned: mention.mentioned,
      mentionRank: mention.rank,
      sentiment: heuristicSentiment(rawAnswer, input.targetDomain),
      competitorsMentioned: competitorsFromAnswer(
        rawAnswer,
        citations,
        input.competitors,
      ),
      citations,
      ourCitationUrl: findOurCitation(citations, input.targetDomain),
      rawAnswer,
      tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
      tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
      costCents: 1,
    };
  },
};
