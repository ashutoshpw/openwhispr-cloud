/**
 * Google AI Overview adapter via DataForSEO.
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

interface DataForSeoAioResponse {
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    cost?: number;
    result?: Array<{
      items?: Array<{
        type?: string;
        text?: string;
        markdown?: string;
        references?: Array<{ url?: string; title?: string; domain?: string }>;
      }>;
    }>;
  }>;
}

const DEFAULT_BASE = "https://api.dataforseo.com";
const DEFAULT_LOCATION = 2840;
const DEFAULT_LANG = "en";

export const googleAioEngine: AieoEngine = {
  id: "google_aio",
  async query(input: AieoQueryInput): Promise<AieoQueryResult> {
    const body = [
      {
        keyword: input.prompt,
        location_code: DEFAULT_LOCATION,
        language_code: DEFAULT_LANG,
        device: "desktop",
      },
    ];
    const res = await fetch(
      `${DEFAULT_BASE}/v3/serp/google/ai_overview/live/advanced`,
      {
        method: "POST",
        headers: {
          Authorization: input.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `DataForSEO AIO HTTP ${res.status}: ${txt.slice(0, 300)}`,
      );
    }

    const data = (await res.json()) as DataForSeoAioResponse;
    const task = data.tasks?.[0];
    if (!task || task.status_code === undefined) {
      throw new Error("DataForSEO AIO malformed response");
    }
    if (task.status_code !== 20000 && task.status_code !== 20100) {
      throw new Error(
        `DataForSEO AIO failed (${task.status_code}): ${task.status_message ?? ""}`,
      );
    }

    const items = task.result?.[0]?.items ?? [];
    const aioBlock = items.find(
      (i) => i.type === "ai_overview" || i.type === "ai_overview_element",
    );
    const rawAnswer = aioBlock?.text || aioBlock?.markdown || "";

    const citations: AieoCitation[] = [];
    for (const ref of aioBlock?.references ?? []) {
      if (!ref.url) continue;
      const c = urlToCitation(ref.url, ref.title);
      if (c) citations.push(c);
    }

    const mention = findBrandMention(rawAnswer, input.targetDomain);

    return {
      brandMentioned:
        mention.mentioned || !!findOurCitation(citations, input.targetDomain),
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
      tokensIn: 0,
      tokensOut: 0,
      costCents: task.cost ? Math.ceil(task.cost * 100) : 1,
    };
  },
};
