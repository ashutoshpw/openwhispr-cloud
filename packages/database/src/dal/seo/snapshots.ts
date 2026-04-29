import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../client";
import { seoKeywordSnapshots } from "../../schema-seo";

export interface SeoKeywordSnapshotRow {
  id: string;
  keywordId: string;
  capturedAt: number;
  position: number | null;
  rankingUrl: string | null;
  source: string;
}

export interface InsertSnapshotInput {
  keywordId: string;
  capturedAt?: number;
  position: number | null;
  rankingUrl?: string | null;
  source: string;
}

export async function insertSnapshot(
  input: InsertSnapshotInput,
): Promise<SeoKeywordSnapshotRow> {
  const [row] = await db()
    .insert(seoKeywordSnapshots)
    .values({
      keywordId: input.keywordId,
      capturedAt: input.capturedAt ?? Math.floor(Date.now() / 1000),
      position: input.position,
      rankingUrl: input.rankingUrl ?? null,
      source: input.source,
    })
    .returning();
  return row as SeoKeywordSnapshotRow;
}

export async function listSnapshotsForKeyword(
  keywordId: string,
  opts: { limit?: number } = {},
): Promise<SeoKeywordSnapshotRow[]> {
  return db()
    .select()
    .from(seoKeywordSnapshots)
    .where(eq(seoKeywordSnapshots.keywordId, keywordId))
    .orderBy(desc(seoKeywordSnapshots.capturedAt))
    .limit(opts.limit ?? 100) as Promise<SeoKeywordSnapshotRow[]>;
}

/**
 * Latest + previous snapshot per keyword. One round-trip via ROW_NUMBER().
 */
export async function getLatestSnapshotsWithDelta(
  opts: { activeOnly?: boolean } = {},
): Promise<
  Array<{
    keywordId: string;
    keyword: string;
    targetPath: string | null;
    cluster: string | null;
    priority: string | null;
    intent: string | null;
    searchVolume: number | null;
    difficulty: string | null;
    latestPosition: number | null;
    latestCapturedAt: number | null;
    previousPosition: number | null;
    previousCapturedAt: number | null;
    rankingUrl: string | null;
  }>
> {
  const activeFilter = opts.activeOnly ? sql`WHERE k.is_active = true` : sql``;

  const rows = await db().execute(sql`
    WITH ranked AS (
      SELECT
        s.keyword_id,
        s.position,
        s.captured_at,
        s.ranking_url,
        ROW_NUMBER() OVER (PARTITION BY s.keyword_id ORDER BY s.captured_at DESC) AS rn
      FROM seo_keyword_snapshots s
    ),
    latest AS (SELECT * FROM ranked WHERE rn = 1),
    previous AS (SELECT * FROM ranked WHERE rn = 2)
    SELECT
      k.id AS keyword_id,
      k.keyword,
      k.target_path,
      k.cluster,
      k.priority,
      k.intent,
      k.search_volume,
      k.difficulty,
      latest.position AS latest_position,
      latest.captured_at AS latest_captured_at,
      previous.position AS previous_position,
      previous.captured_at AS previous_captured_at,
      latest.ranking_url
    FROM seo_keywords k
    LEFT JOIN latest ON latest.keyword_id = k.id
    LEFT JOIN previous ON previous.keyword_id = k.id
    ${activeFilter}
    ORDER BY k.priority ASC, k.keyword ASC
  `);

  // neon-http returns an array directly rather than a { rows } object.
  const list = Array.isArray(rows)
    ? rows
    : ((rows as { rows?: unknown[] })?.rows ?? []);
  return (list as Record<string, unknown>[]).map((r) => ({
    keywordId: r.keyword_id as string,
    keyword: r.keyword as string,
    targetPath: (r.target_path as string | null) ?? null,
    cluster: (r.cluster as string | null) ?? null,
    priority: (r.priority as string | null) ?? null,
    intent: (r.intent as string | null) ?? null,
    searchVolume: r.search_volume != null ? Number(r.search_volume) : null,
    difficulty: (r.difficulty as string | null) ?? null,
    latestPosition:
      r.latest_position != null ? Number(r.latest_position) : null,
    latestCapturedAt:
      r.latest_captured_at != null ? Number(r.latest_captured_at) : null,
    previousPosition:
      r.previous_position != null ? Number(r.previous_position) : null,
    previousCapturedAt:
      r.previous_captured_at != null ? Number(r.previous_captured_at) : null,
    rankingUrl: (r.ranking_url as string | null) ?? null,
  }));
}

/**
 * Idempotency helper: true if a snapshot already exists for this keyword on
 * the same UTC day as `capturedAt`.
 */
export async function hasSnapshotOnDate(
  keywordId: string,
  capturedAt: number,
): Promise<boolean> {
  const dayStart = Math.floor(capturedAt / 86400) * 86400;
  const dayEnd = dayStart + 86400;
  const rows = await db()
    .select({ id: seoKeywordSnapshots.id })
    .from(seoKeywordSnapshots)
    .where(
      and(
        eq(seoKeywordSnapshots.keywordId, keywordId),
        gte(seoKeywordSnapshots.capturedAt, dayStart),
        sql`${seoKeywordSnapshots.capturedAt} < ${dayEnd}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}
