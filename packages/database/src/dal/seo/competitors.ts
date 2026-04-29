import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../client";
import { seoCompetitors } from "../../schema-seo";

export interface SeoCompetitorRow {
  id: string;
  domain: string;
  firstSeenAt: number;
  mentionCount: number;
  isManual: boolean;
  isExcluded: boolean;
}

export async function listCompetitors(
  opts: { includeExcluded?: boolean; limit?: number } = {},
): Promise<SeoCompetitorRow[]> {
  const where = opts.includeExcluded
    ? undefined
    : eq(seoCompetitors.isExcluded, false);
  const rows = await db()
    .select()
    .from(seoCompetitors)
    .where(where)
    .orderBy(desc(seoCompetitors.mentionCount), asc(seoCompetitors.domain))
    .limit(opts.limit ?? 200);
  return rows as SeoCompetitorRow[];
}

export async function listTopCompetitorDomains(limit = 20): Promise<string[]> {
  const rows = await db()
    .select({ domain: seoCompetitors.domain })
    .from(seoCompetitors)
    .where(eq(seoCompetitors.isExcluded, false))
    .orderBy(desc(seoCompetitors.mentionCount))
    .limit(limit);
  return rows.map((r) => r.domain);
}

export async function upsertCompetitor(
  domain: string,
  increment = 1,
): Promise<void> {
  await db().execute(sql`
    INSERT INTO seo_competitors (domain, mention_count)
    VALUES (${domain}, ${increment})
    ON CONFLICT (domain) DO UPDATE SET
      mention_count = seo_competitors.mention_count + EXCLUDED.mention_count
  `);
}

export async function setCompetitorPinned(
  id: string,
  isManual: boolean,
): Promise<void> {
  await db()
    .update(seoCompetitors)
    .set({ isManual })
    .where(eq(seoCompetitors.id, id));
}

export async function setCompetitorExcluded(
  id: string,
  isExcluded: boolean,
): Promise<void> {
  await db()
    .update(seoCompetitors)
    .set({ isExcluded })
    .where(eq(seoCompetitors.id, id));
}
