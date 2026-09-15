import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { z } from "zod";

/**
 * POST /api/agent/web-search — search tool for the cloud agent.
 *
 * Gated on WEB_SEARCH_API_KEY; results come from DuckDuckGo's free
 * instant-answer API (RelatedTopics mapped to {title, url, snippet}).
 */

const payloadSchema = z.object({
  query: z.string().min(1),
  numResults: z.number().int().min(1).max(20).optional(),
});

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface DuckDuckGoTopic {
  FirstURL?: string;
  Text?: string;
  Topics?: DuckDuckGoTopic[];
}

async function searchDuckDuckGo(
  query: string,
  numResults: number,
): Promise<WebSearchResult[]> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: DuckDuckGoTopic[];
    };

    const results: WebSearchResult[] = [];
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
      });
    }
    const flatten = (topics: DuckDuckGoTopic[]) => {
      for (const topic of topics) {
        if (results.length >= numResults) return;
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
        if (Array.isArray(topic.Topics)) flatten(topic.Topics);
      }
    };
    if (Array.isArray(data.RelatedTopics)) flatten(data.RelatedTopics);
    return results;
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  return withSession(request, async () => {
    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid web search payload");
    }
    if (!process.env.WEB_SEARCH_API_KEY) {
      return syncError(503, "Search provider not configured");
    }
    const results = await searchDuckDuckGo(
      parsed.data.query,
      parsed.data.numResults ?? 5,
    );
    return syncOk(
      { results },
      { headers: { "x-search-provider": "duckduckgo" } },
    );
  });
}
