/**
 * Thin DataForSEO SERP client used by the SEO rank-tracking cron.
 */

const SERP_BASE_URL =
  process.env.DATAFORSEO_SERP_BASE_URL || "https://api.dataforseo.com";

export interface SerpRankInput {
  keyword: string;
  targetDomain: string;
  country?: string;
  languageCode?: string;
  depth?: number;
}

export interface SerpRankResult {
  keyword: string;
  position: number | null;
  rankingUrl: string | null;
  cost: number;
  raw?: unknown;
}

const DEFAULT_LOCATION_CODE = 2840;
const COUNTRY_TO_LOCATION: Record<string, number> = {
  US: 2840,
  GB: 2826,
  CA: 2124,
  AU: 2036,
  DE: 2276,
  FR: 2250,
  IN: 2356,
};

function authHeader(): string {
  const auth = process.env.DATAFORSEO_AUTH;
  if (!auth) {
    throw new Error(
      "DATAFORSEO_AUTH must be set (pre-built `Basic <base64>` header value)",
    );
  }
  return auth;
}

export async function fetchSerpRank(
  input: SerpRankInput,
): Promise<SerpRankResult> {
  const country = input.country ?? "US";
  const locationCode = COUNTRY_TO_LOCATION[country] ?? DEFAULT_LOCATION_CODE;

  const body = [
    {
      keyword: input.keyword,
      location_code: locationCode,
      language_code: input.languageCode ?? "en",
      depth: input.depth ?? 100,
      device: "desktop",
    },
  ];

  const res = await fetch(
    `${SERP_BASE_URL}/v3/serp/google/organic/live/regular`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `DataForSEO SERP HTTP ${res.status}: ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    tasks?: Array<{
      status_code?: number;
      status_message?: string;
      cost?: number;
      result?: Array<{
        items?: Array<{
          type?: string;
          rank_absolute?: number;
          rank_group?: number;
          domain?: string;
          url?: string;
        }>;
      }>;
    }>;
  };

  const task = data.tasks?.[0];
  if (!task || task.status_code === undefined) {
    throw new Error(
      `DataForSEO SERP malformed response: ${JSON.stringify(data).slice(0, 200)}`,
    );
  }
  if (task.status_code !== 20000) {
    throw new Error(
      `DataForSEO SERP task failed (${task.status_code}): ${task.status_message ?? "unknown"}`,
    );
  }

  const items = task.result?.[0]?.items ?? [];
  const match = items.find(
    (item) =>
      (item.type === "organic" || item.type === undefined) &&
      typeof item.domain === "string" &&
      item.domain.toLowerCase().endsWith(input.targetDomain.toLowerCase()),
  );

  return {
    keyword: input.keyword,
    position: match?.rank_absolute ?? null,
    rankingUrl: match?.url ?? null,
    cost: task.cost ?? 0,
  };
}
