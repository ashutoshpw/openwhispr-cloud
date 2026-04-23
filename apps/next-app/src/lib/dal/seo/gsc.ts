import { and, db, desc, eq, gte, lte, seoGscDaily, sql } from "@repo/database";

export interface UpsertGscRowInput {
  date: string;
  page: string;
  query: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Bulk upsert into seo_gsc_daily on (date, page, query). query=NULL stores
 * page-level totals.
 */
export async function upsertGscRows(
  rows: UpsertGscRowInput[],
): Promise<number> {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (const r of rows) {
    await db().execute(sql`
      INSERT INTO seo_gsc_daily
        (date, page, query, clicks, impressions, ctr, position)
      VALUES
        (${r.date}, ${r.page}, ${r.query}, ${r.clicks}, ${r.impressions}, ${r.ctr}, ${r.position})
      ON CONFLICT (date, page, query) DO UPDATE SET
        clicks = EXCLUDED.clicks,
        impressions = EXCLUDED.impressions,
        ctr = EXCLUDED.ctr,
        position = EXCLUDED.position,
        fetched_at = EXTRACT(epoch FROM now())::bigint
    `);
    inserted++;
  }
  return inserted;
}

export interface GscRange {
  startDate: string;
  endDate: string;
}

function unwrap(rows: unknown): Record<string, unknown>[] {
  if (Array.isArray(rows)) return rows as Record<string, unknown>[];
  const inner = (rows as { rows?: unknown[] })?.rows ?? [];
  return inner as Record<string, unknown>[];
}

export async function getPageTotals(range: GscRange): Promise<
  Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>
> {
  const rows = await db().execute(sql`
    SELECT
      page,
      SUM(clicks)::bigint AS clicks,
      SUM(impressions)::bigint AS impressions,
      AVG(ctr) AS ctr,
      AVG(position) AS position
    FROM seo_gsc_daily
    WHERE date BETWEEN ${range.startDate} AND ${range.endDate}
      AND query IS NULL
    GROUP BY page
    ORDER BY clicks DESC
  `);
  return unwrap(rows).map((r) => ({
    page: r.page as string,
    clicks: Number(r.clicks ?? 0),
    impressions: Number(r.impressions ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: Number(r.position ?? 0),
  }));
}

export async function getSiteSummary(range: GscRange): Promise<{
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}> {
  const rows = await db().execute(sql`
    SELECT
      COALESCE(SUM(clicks), 0)::bigint AS clicks,
      COALESCE(SUM(impressions), 0)::bigint AS impressions,
      COALESCE(AVG(NULLIF(ctr, 0)), 0) AS ctr,
      COALESCE(AVG(NULLIF(position, 0)), 0) AS position
    FROM seo_gsc_daily
    WHERE date BETWEEN ${range.startDate} AND ${range.endDate}
      AND query IS NULL
  `);
  const r = unwrap(rows)[0] ?? {};
  return {
    clicks: Number(r.clicks ?? 0),
    impressions: Number(r.impressions ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: Number(r.position ?? 0),
  };
}

export async function getTopQueries(
  range: GscRange,
  limit = 25,
): Promise<
  Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    pageCount: number;
  }>
> {
  const rows = await db().execute(sql`
    SELECT
      query,
      SUM(clicks)::bigint AS clicks,
      SUM(impressions)::bigint AS impressions,
      AVG(ctr) AS ctr,
      AVG(position) AS position,
      COUNT(DISTINCT page)::bigint AS page_count
    FROM seo_gsc_daily
    WHERE date BETWEEN ${range.startDate} AND ${range.endDate}
      AND query IS NOT NULL
    GROUP BY query
    ORDER BY clicks DESC
    LIMIT ${limit}
  `);
  return unwrap(rows).map((r) => ({
    query: r.query as string,
    clicks: Number(r.clicks ?? 0),
    impressions: Number(r.impressions ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: Number(r.position ?? 0),
    pageCount: Number(r.page_count ?? 0),
  }));
}

export async function getDailySeriesForPage(
  page: string,
  range: GscRange,
): Promise<
  Array<{
    date: string;
    clicks: number;
    impressions: number;
    position: number;
  }>
> {
  const rows = await db()
    .select({
      date: seoGscDaily.date,
      clicks: seoGscDaily.clicks,
      impressions: seoGscDaily.impressions,
      position: seoGscDaily.position,
    })
    .from(seoGscDaily)
    .where(
      and(
        eq(seoGscDaily.page, page),
        sql`${seoGscDaily.query} IS NULL`,
        gte(seoGscDaily.date, range.startDate),
        lte(seoGscDaily.date, range.endDate),
      ),
    )
    .orderBy(desc(seoGscDaily.date));
  return rows;
}
