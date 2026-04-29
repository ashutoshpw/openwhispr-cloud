/**
 * OpenAI adapter using Responses API with the web_search tool.
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

interface OpenAIResponse {
  id: string;
  model: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        url?: string;
        title?: string;
        url_citation?: { url?: string; title?: string };
      }>;
    }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const DEFAULT_MODEL = "gpt-5.4-mini";
const COST_INPUT_CENTS_PER_1M = 75;
const COST_OUTPUT_CENTS_PER_1M = 450;

export const openaiEngine: AieoEngine = {
  id: "openai",
  async query(input: AieoQueryInput): Promise<AieoQueryResult> {
    const model = input.modelId || DEFAULT_MODEL;
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        input: [{ role: "user", content: input.prompt }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = (await res.json()) as OpenAIResponse;

    let rawAnswer = data.output_text ?? "";
    const citations: AieoCitation[] = [];
    for (const out of data.output ?? []) {
      for (const c of out.content ?? []) {
        if (typeof c.text === "string" && !data.output_text)
          rawAnswer += c.text;
        for (const a of c.annotations ?? []) {
          const url = a.url_citation?.url ?? a.url;
          if (!url) continue;
          const cit = urlToCitation(url, a.url_citation?.title ?? a.title);
          if (cit) citations.push(cit);
        }
      }
    }

    const mention = findBrandMention(rawAnswer, input.targetDomain);
    const tokensIn = data.usage?.input_tokens ?? 0;
    const tokensOut = data.usage?.output_tokens ?? 0;
    const costCents =
      Math.ceil((tokensIn * COST_INPUT_CENTS_PER_1M) / 1_000_000) +
      Math.ceil((tokensOut * COST_OUTPUT_CENTS_PER_1M) / 1_000_000);

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
      tokensIn,
      tokensOut,
      costCents: Math.max(costCents, 1),
    };
  },
};
