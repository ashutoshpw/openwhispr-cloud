import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../../client";
import { seoKeywordSnapshots, seoKeywords } from "../../schema-seo";

export interface SeoKeywordRow {
  id: string;
  keyword: string;
  cluster: string | null;
  intent: string | null;
  targetPath: string | null;
  priority: string | null;
  searchVolume: number | null;
  difficulty: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export async function listKeywords(
  opts: { activeOnly?: boolean } = {},
): Promise<SeoKeywordRow[]> {
  const where = opts.activeOnly ? eq(seoKeywords.isActive, true) : undefined;
  return db()
    .select()
    .from(seoKeywords)
    .where(where)
    .orderBy(asc(seoKeywords.priority), asc(seoKeywords.keyword));
}

export async function getKeywordById(
  id: string,
): Promise<SeoKeywordRow | null> {
  const rows = await db()
    .select()
    .from(seoKeywords)
    .where(eq(seoKeywords.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getKeywordByText(
  keyword: string,
): Promise<SeoKeywordRow | null> {
  const rows = await db()
    .select()
    .from(seoKeywords)
    .where(eq(seoKeywords.keyword, keyword))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreateKeywordInput {
  keyword: string;
  cluster?: string | null;
  intent?: string | null;
  targetPath?: string | null;
  priority?: string | null;
  searchVolume?: number | null;
  difficulty?: string | null;
}

export async function createKeyword(
  input: CreateKeywordInput,
): Promise<SeoKeywordRow> {
  const [row] = await db()
    .insert(seoKeywords)
    .values({
      keyword: input.keyword,
      cluster: input.cluster ?? null,
      intent: input.intent ?? null,
      targetPath: input.targetPath ?? null,
      priority: input.priority ?? "medium",
      searchVolume: input.searchVolume ?? null,
      difficulty: input.difficulty ?? null,
    })
    .returning();
  return row as SeoKeywordRow;
}

export async function updateKeyword(
  id: string,
  patch: Partial<CreateKeywordInput> & { isActive?: boolean },
): Promise<SeoKeywordRow | null> {
  const [row] = await db()
    .update(seoKeywords)
    .set({
      ...patch,
      updatedAt: sql`EXTRACT(epoch FROM now())::bigint` as unknown as number,
    })
    .where(eq(seoKeywords.id, id))
    .returning();
  return (row as SeoKeywordRow) ?? null;
}

export async function archiveKeyword(id: string): Promise<void> {
  await db()
    .update(seoKeywords)
    .set({
      isActive: false,
      updatedAt: sql`EXTRACT(epoch FROM now())::bigint` as unknown as number,
    })
    .where(eq(seoKeywords.id, id));
}

/**
 * Keywords whose latest snapshot is older than `staleAfterSeconds` seconds
 * (or have never been snapshotted). Powers the dashboard coverage-gaps card.
 */
export async function findKeywordsWithStaleSnapshots(
  staleAfterSeconds: number,
): Promise<Array<SeoKeywordRow & { lastCapturedAt: number | null }>> {
  const threshold = Math.floor(Date.now() / 1000) - staleAfterSeconds;

  const latestSnapshotSql = sql<number | null>`(
    SELECT MAX(s.captured_at)
    FROM ${seoKeywordSnapshots} s
    WHERE s.keyword_id = ${seoKeywords.id}
  )`;

  const rows = await db()
    .select({
      id: seoKeywords.id,
      keyword: seoKeywords.keyword,
      cluster: seoKeywords.cluster,
      intent: seoKeywords.intent,
      targetPath: seoKeywords.targetPath,
      priority: seoKeywords.priority,
      searchVolume: seoKeywords.searchVolume,
      difficulty: seoKeywords.difficulty,
      isActive: seoKeywords.isActive,
      createdAt: seoKeywords.createdAt,
      updatedAt: seoKeywords.updatedAt,
      lastCapturedAt: latestSnapshotSql,
    })
    .from(seoKeywords)
    .where(
      and(
        eq(seoKeywords.isActive, true),
        or(isNull(latestSnapshotSql), sql`${latestSnapshotSql} < ${threshold}`),
      ),
    )
    .orderBy(asc(seoKeywords.keyword));

  return rows as Array<SeoKeywordRow & { lastCapturedAt: number | null }>;
}
