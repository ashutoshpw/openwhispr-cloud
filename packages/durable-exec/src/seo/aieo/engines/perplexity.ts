/**
 * Perplexity Sonar adapter.
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

interface PerplexityResponse {
  id: string;
  model: string;
  citations?: string[];
  search_results?: Array<{ url: string; title?: string }>;
  choices: Array<{ message: { content: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_cost?: number;
  };
}

const DEFAULT_MODEL = "sonar-pro";

export const perplexityEngine: AieoEngine = {
  id: "perplexity",
  async query(input: AieoQueryInput): Promise<AieoQueryResult> {
    const model = input.modelId || DEFAULT_MODEL;
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Answer the user's question using current web sources and include citations.",
          },
          { role: "user", content: input.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Perplexity HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = (await res.json()) as PerplexityResponse;
    const rawAnswer = data.choices?.[0]?.message?.content ?? "";

    const citations: AieoCitation[] = [];
    if (Array.isArray(data.search_results)) {
      for (const r of data.search_results) {
        const c = urlToCitation(r.url, r.title);
        if (c) citations.push(c);
      }
    }
    if (citations.length === 0 && Array.isArray(data.citations)) {
      for (const url of data.citations) {
        const c = urlToCitation(url);
        if (c) citations.push(c);
      }
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
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
      costCents: data.usage?.total_cost
        ? Math.ceil(data.usage.total_cost * 100)
        : 1,
    };
  },
};
