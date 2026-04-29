import "server-only";

import type { AnalyticsFunnel, AnalyticsFunnelStep } from "@repo/database";
import { type RangeKey, rangeDays } from "./admin-range";
import type { SeriesResult, SnapshotItem } from "./types";

const DEFAULT_HOST = "https://app.posthog.com";

function host(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST;
}

export type PostHogConfigStatus =
  | { ok: true; projectId: string }
  | { ok: false; reason: string };

export function assertPosthogConfigured(): PostHogConfigStatus {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey) {
    return {
      ok: false,
      reason:
        "POSTHOG_PERSONAL_API_KEY is not set. Generate one at https://app.posthog.com/settings/user-api-keys and add it to your .env.local.",
    };
  }
  if (!projectId) {
    return {
      ok: false,
      reason:
        "POSTHOG_PROJECT_ID is not set. Run the PostHog setup script or set it manually in .env.local.",
    };
  }
  return { ok: true, projectId };
}

interface PostHogQueryResponse {
  results: unknown[][];
  columns?: string[];
  types?: string[];
}

interface PostHogFunnelStepResult {
  name?: string;
  custom_name?: string | null;
  count: number;
}

interface PostHogFunnelResponse {
  results: PostHogFunnelStepResult[];
}

async function postQuery<T>(body: unknown): Promise<T> {
  const cfg = assertPosthogConfigured();
  if (!cfg.ok) throw new Error(cfg.reason);

  const url = `${host()}/api/projects/${cfg.projectId}/query/`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `PostHog query failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

async function runHogQL<Row extends Record<string, unknown>>(
  query: string,
  values?: Record<string, unknown>,
): Promise<Row[]> {
  const data = await postQuery<PostHogQueryResponse>({
    query: { kind: "HogQLQuery", query, values },
  });
  const cols = data.columns ?? [];
  return data.results.map((row) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as Row;
  });
}

export interface QueryRange {
  fromIso: string;
  toIso: string;
  prevFromIso: string;
  prevToIso: string;
  days: number;
  bucket: "day" | "week";
}

export function buildQueryRange(range: RangeKey): QueryRange {
  const days = rangeDays(range);
  const bucket: "day" | "week" =
    range === "1y" || range === "all" ? "week" : "day";
  const now = Date.now();
  const dayMs = 86_400_000;
  const to = new Date(now);
  const from = new Date(now - days * dayMs);
  const prevTo = from;
  const prevFrom = new Date(now - days * 2 * dayMs);
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    prevFromIso: prevFrom.toISOString(),
    prevToIso: prevTo.toISOString(),
    days,
    bucket,
  };
}

export async function getPageviewsSeries(
  range: RangeKey,
): Promise<SeriesResult> {
  const r = buildQueryRange(range);
  const truncFn = r.bucket === "week" ? "toStartOfWeek" : "toStartOfDay";

  const series = await runHogQL<{ bucket: string; v: number }>(
    `
    SELECT
      ${truncFn}(timestamp) AS bucket,
      count() AS v
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from}
      AND timestamp <  {to}
    GROUP BY bucket
    ORDER BY bucket ASC
    `,
    { from: r.fromIso, to: r.toIso },
  );

  const [{ total = 0 } = { total: 0 }] = await runHogQL<{ total: number }>(
    `
    SELECT count() AS total FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from} AND timestamp < {to}
    `,
    { from: r.prevFromIso, to: r.prevToIso },
  );

  const points = series.map((row) => ({
    date: toDateKey(row.bucket),
    value: Number(row.v ?? 0),
  }));
  const dense = densifySeries(points, r);
  const totalCurrent = dense.reduce((a, p) => a + p.value, 0);

  return {
    series: dense,
    total: totalCurrent,
    prevTotal: Number(total ?? 0),
    rangeDays: r.days,
    bucket: r.bucket,
  };
}

function toDateKey(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.slice(0, 10);
}

function densifySeries(
  points: { date: string; value: number }[],
  r: QueryRange,
): { date: string; value: number }[] {
  const map = new Map(points.map((p) => [p.date, p.value]));
  const out: { date: string; value: number }[] = [];
  const start = new Date(r.fromIso);
  const end = new Date(r.toIso);
  const stepMs = r.bucket === "week" ? 7 * 86_400_000 : 86_400_000;
  for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
    const key = new Date(t).toISOString().slice(0, 10);
    out.push({ date: key, value: map.get(key) ?? 0 });
  }
  return out;
}

export interface TrafficKpis {
  pageviews: { current: number; previous: number };
  visitors: { current: number; previous: number };
  sessions: { current: number; previous: number };
  pagesPerSession: { current: number; previous: number };
}

export async function getTrafficKpis(range: RangeKey): Promise<TrafficKpis> {
  const r = buildQueryRange(range);
  const [cur, prev] = await Promise.all([
    kpiQuery(r.fromIso, r.toIso),
    kpiQuery(r.prevFromIso, r.prevToIso),
  ]);
  return {
    pageviews: { current: cur.pageviews, previous: prev.pageviews },
    visitors: { current: cur.visitors, previous: prev.visitors },
    sessions: { current: cur.sessions, previous: prev.sessions },
    pagesPerSession: {
      current: cur.sessions > 0 ? cur.pageviews / cur.sessions : 0,
      previous: prev.sessions > 0 ? prev.pageviews / prev.sessions : 0,
    },
  };
}

async function kpiQuery(from: string, to: string) {
  const [row] = await runHogQL<{
    pageviews: number;
    visitors: number;
    sessions: number;
  }>(
    `
    SELECT
      count() AS pageviews,
      count(DISTINCT distinct_id) AS visitors,
      count(DISTINCT properties.$session_id) AS sessions
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from} AND timestamp < {to}
    `,
    { from, to },
  );
  return {
    pageviews: Number(row?.pageviews ?? 0),
    visitors: Number(row?.visitors ?? 0),
    sessions: Number(row?.sessions ?? 0),
  };
}

function toSnapshot(rows: { label: unknown; value: unknown }[]): {
  items: SnapshotItem[];
  total: number;
} {
  const items: SnapshotItem[] = rows
    .map((r) => ({
      label: String(r.label ?? "(unknown)"),
      value: Number(r.value ?? 0),
    }))
    .filter((i) => i.value > 0);
  const total = items.reduce((a, i) => a + i.value, 0);
  return { items, total };
}

export async function getChannelBreakdown(
  range: RangeKey,
): Promise<{ items: SnapshotItem[]; total: number }> {
  const r = buildQueryRange(range);
  const rows = await runHogQL<{ label: string; value: number }>(
    `
    WITH first_pv AS (
      SELECT
        properties.$session_id AS sid,
        argMin(properties.$referring_domain, timestamp) AS ref,
        argMin(properties.utm_source, timestamp) AS utm_source,
        argMin(properties.utm_medium, timestamp) AS utm_medium
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= {from} AND timestamp < {to}
        AND properties.$session_id IS NOT NULL
      GROUP BY sid
    )
    SELECT
      multiIf(
        utm_medium IN ('cpc','ppc','paid','paidsearch','paid-search'), 'Paid Search',
        utm_medium = 'email', 'Email',
        utm_medium IN ('social','social-paid','paid-social'), 'Social',
        ref = '' OR ref IS NULL, 'Direct',
        ref ILIKE '%google.%' OR ref ILIKE '%bing.%' OR ref ILIKE '%duckduckgo.%' OR ref ILIKE '%yahoo.%' OR ref ILIKE '%yandex.%' OR ref ILIKE '%baidu.%' OR ref ILIKE '%ecosia.%' OR ref ILIKE '%brave.%', 'Organic Search',
        ref ILIKE '%twitter.%' OR ref ILIKE '%t.co%' OR ref ILIKE '%x.com%' OR ref ILIKE '%facebook.%' OR ref ILIKE '%instagram.%' OR ref ILIKE '%linkedin.%' OR ref ILIKE '%youtube.%' OR ref ILIKE '%reddit.%' OR ref ILIKE '%tiktok.%' OR ref ILIKE '%pinterest.%', 'Social',
        'Referral'
      ) AS label,
      count() AS value
    FROM first_pv
    GROUP BY label
    ORDER BY value DESC
    `,
    { from: r.fromIso, to: r.toIso },
  );
  return toSnapshot(rows);
}

export async function getTopReferringDomains(
  range: RangeKey,
  limit = 10,
): Promise<{ items: SnapshotItem[]; total: number }> {
  const r = buildQueryRange(range);
  const rows = await runHogQL<{ label: string; value: number }>(
    `
    SELECT
      properties.$referring_domain AS label,
      count() AS value
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from} AND timestamp < {to}
      AND properties.$referring_domain IS NOT NULL
      AND properties.$referring_domain != ''
      AND properties.$referring_domain != '$direct'
    GROUP BY label
    ORDER BY value DESC
    LIMIT {limit}
    `,
    { from: r.fromIso, to: r.toIso, limit },
  );
  return toSnapshot(rows);
}

export async function getTopUtmCampaigns(
  range: RangeKey,
  limit = 10,
): Promise<{ items: SnapshotItem[]; total: number }> {
  const r = buildQueryRange(range);
  const rows = await runHogQL<{ label: string; value: number }>(
    `
    SELECT
      properties.utm_campaign AS label,
      count(DISTINCT properties.$session_id) AS value
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from} AND timestamp < {to}
      AND properties.utm_campaign IS NOT NULL
      AND properties.utm_campaign != ''
    GROUP BY label
    ORDER BY value DESC
    LIMIT {limit}
    `,
    { from: r.fromIso, to: r.toIso, limit },
  );
  return toSnapshot(rows);
}

export async function getUtmSourceMediumMatrix(
  range: RangeKey,
  limit = 10,
): Promise<{ items: SnapshotItem[]; total: number }> {
  const r = buildQueryRange(range);
  const rows = await runHogQL<{ label: string; value: number }>(
    `
    SELECT
      concat(coalesce(properties.utm_source, '—'), ' / ', coalesce(properties.utm_medium, '—')) AS label,
      count(DISTINCT properties.$session_id) AS value
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from} AND timestamp < {to}
      AND (properties.utm_source IS NOT NULL OR properties.utm_medium IS NOT NULL)
    GROUP BY label
    ORDER BY value DESC
    LIMIT {limit}
    `,
    { from: r.fromIso, to: r.toIso, limit },
  );
  return toSnapshot(rows);
}

export async function getTopLandingPages(
  range: RangeKey,
  limit = 10,
): Promise<{ items: SnapshotItem[]; total: number }> {
  const r = buildQueryRange(range);
  const rows = await runHogQL<{ label: string; value: number }>(
    `
    WITH first_pv AS (
      SELECT
        properties.$session_id AS sid,
        argMin(properties.$pathname, timestamp) AS path
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= {from} AND timestamp < {to}
        AND properties.$session_id IS NOT NULL
      GROUP BY sid
    )
    SELECT path AS label, count() AS value
    FROM first_pv
    WHERE path IS NOT NULL AND path != ''
    GROUP BY label
    ORDER BY value DESC
    LIMIT {limit}
    `,
    { from: r.fromIso, to: r.toIso, limit },
  );
  return toSnapshot(rows);
}

export async function getDeviceBreakdown(
  range: RangeKey,
): Promise<{ items: SnapshotItem[]; total: number }> {
  const r = buildQueryRange(range);
  const rows = await runHogQL<{ label: string; value: number }>(
    `
    SELECT
      coalesce(properties.$device_type, 'unknown') AS label,
      count(DISTINCT properties.$session_id) AS value
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from} AND timestamp < {to}
    GROUP BY label
    ORDER BY value DESC
    `,
    { from: r.fromIso, to: r.toIso },
  );
  return toSnapshot(rows);
}

export async function getTopCountries(
  range: RangeKey,
  limit = 10,
): Promise<{ items: SnapshotItem[]; total: number }> {
  const r = buildQueryRange(range);
  const rows = await runHogQL<{ label: string; value: number }>(
    `
    SELECT
      coalesce(properties.$geoip_country_name, 'Unknown') AS label,
      count(DISTINCT properties.$session_id) AS value
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= {from} AND timestamp < {to}
    GROUP BY label
    ORDER BY value DESC
    LIMIT {limit}
    `,
    { from: r.fromIso, to: r.toIso, limit },
  );
  return toSnapshot(rows);
}

export interface FunnelStepResult {
  label: string;
  count: number;
  conversionFromPrev: number;
  conversionFromStart: number;
  dropoff: number;
}

export interface FunnelComputed {
  steps: FunnelStepResult[];
  overall: number;
}

export async function getPageFlowFunnel(
  funnel: AnalyticsFunnel,
  range: RangeKey,
): Promise<FunnelComputed> {
  const r = buildQueryRange(range);
  const steps = (funnel.steps ?? []).filter(
    (s: AnalyticsFunnelStep) => s?.path,
  );
  if (steps.length === 0) {
    return { steps: [], overall: 0 };
  }

  const series = steps.map((step: AnalyticsFunnelStep) => ({
    kind: "EventsNode",
    event: "$pageview",
    properties: [
      {
        type: "event",
        key: "$pathname",
        operator: step.matchType === "prefix" ? "icontains" : "exact",
        value: step.path,
      },
    ],
  }));

  const data = await postQuery<PostHogFunnelResponse>({
    query: {
      kind: "FunnelsQuery",
      series,
      dateRange: { date_from: r.fromIso, date_to: r.toIso },
      funnelsFilter: {
        funnelVizType: "steps",
        funnelOrderType: "ordered",
      },
    },
  });

  const counts = data.results.map((s, i) => ({
    label: steps[i]?.label || `Step ${i + 1}`,
    count: Number(s?.count ?? 0),
  }));

  const first = counts[0]?.count ?? 0;
  const out: FunnelStepResult[] = counts.map((step, i) => {
    const prev = i === 0 ? step.count : counts[i - 1].count;
    const fromPrev = prev > 0 ? step.count / prev : 0;
    const fromStart = first > 0 ? step.count / first : 0;
    return {
      label: step.label,
      count: step.count,
      conversionFromPrev: fromPrev,
      conversionFromStart: fromStart,
      dropoff: 1 - fromPrev,
    };
  });

  return {
    steps: out,
    overall: first > 0 ? (counts[counts.length - 1].count ?? 0) / first : 0,
  };
}
