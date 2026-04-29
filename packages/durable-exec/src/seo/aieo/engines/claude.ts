/**
 * Anthropic Claude adapter using Messages API + web_search tool.
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

interface ClaudeResponse {
  id: string;
  model: string;
  content?: Array<{
    type?: string;
    text?: string;
    citations?: Array<{ type?: string; url?: string; title?: string }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const DEFAULT_MODEL = "claude-sonnet-4-5";

export const claudeEngine: AieoEngine = {
  id: "claude",
  async query(input: AieoQueryInput): Promise<AieoQueryResult> {
    const model = input.modelId || DEFAULT_MODEL;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: input.prompt }],
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 5 },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Claude HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = (await res.json()) as ClaudeResponse;

    let rawAnswer = "";
    const citations: AieoCitation[] = [];
    for (const block of data.content ?? []) {
      if (typeof block.text === "string") rawAnswer += block.text;
      for (const cit of block.citations ?? []) {
        if (!cit.url) continue;
        const c = urlToCitation(cit.url, cit.title);
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
      tokensIn: data.usage?.input_tokens ?? 0,
      tokensOut: data.usage?.output_tokens ?? 0,
      costCents: 2,
    };
  },
};
