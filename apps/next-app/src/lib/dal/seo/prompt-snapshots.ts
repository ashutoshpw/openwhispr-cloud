import {
  and,
  db,
  desc,
  eq,
  gte,
  isNotNull,
  seoPromptSnapshots,
  seoPrompts,
  sql,
} from "@repo/database";
import { unwrap } from "./_unwrap";

export interface SeoPromptSnapshotRow {
  id: string;
  promptId: string;
  engineId: string;
  capturedAt: number;
  brandMentioned: boolean;
  mentionRank: number | null;
  sentiment: string | null;
  competitorsMentioned: string[];
  citations: Array<{ url: string; domain: string; title?: string }>;
  ourCitationUrl: string | null;
  rawAnswer: string | null;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  source: string;
}

export interface InsertPromptSnapshotInput {
  promptId: string;
  engineId: string;
  capturedAt?: number;
  brandMentioned: boolean;
  mentionRank: number | null;
  sentiment: string | null;
  competitorsMentioned: string[];
  citations: Array<{ url: string; domain: string; title?: string }>;
  ourCitationUrl: string | null;
  rawAnswer: string | null;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  source?: string;
}

export async function insertPromptSnapshot(
  input: InsertPromptSnapshotInput,
): Promise<SeoPromptSnapshotRow> {
  const [row] = await db()
    .insert(seoPromptSnapshots)
    .values({
      promptId: input.promptId,
      engineId: input.engineId,
      capturedAt: input.capturedAt ?? Math.floor(Date.now() / 1000),
      brandMentioned: input.brandMentioned,
      mentionRank: input.mentionRank,
      sentiment: input.sentiment,
      competitorsMentioned: input.competitorsMentioned,
      citations: input.citations,
      ourCitationUrl: input.ourCitationUrl,
      rawAnswer: input.rawAnswer,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      costCents: input.costCents,
      source: input.source ?? "cron",
    })
    .returning();
  return row as SeoPromptSnapshotRow;
}

export async function hasPromptSnapshotOnDate(
  promptId: string,
  engineId: string,
  capturedAt: number,
): Promise<boolean> {
  const dayStart = Math.floor(capturedAt / 86400) * 86400;
  const dayEnd = dayStart + 86400;
  const rows = await db()
    .select({ id: seoPromptSnapshots.id })
    .from(seoPromptSnapshots)
    .where(
      and(
        eq(seoPromptSnapshots.promptId, promptId),
        eq(seoPromptSnapshots.engineId, engineId),
        gte(seoPromptSnapshots.capturedAt, dayStart),
        sql`${seoPromptSnapshots.capturedAt} < ${dayEnd}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listSnapshotsForPrompt(
  promptId: string,
  opts: { limit?: number } = {},
): Promise<SeoPromptSnapshotRow[]> {
  return db()
    .select()
    .from(seoPromptSnapshots)
    .where(eq(seoPromptSnapshots.promptId, promptId))
    .orderBy(desc(seoPromptSnapshots.capturedAt))
    .limit(opts.limit ?? 200) as Promise<SeoPromptSnapshotRow[]>;
}

export interface ShareOfVoiceRow {
  engineId: string;
  totalSnapshots: number;
  brandMentions: number;
  citations: number;
  brandMentionRate: number;
  citationRate: number;
  totalSpendCents: number;
}

export async function getShareOfVoice(opts: {
  sinceDays: number;
}): Promise<ShareOfVoiceRow[]> {
  const since = Math.floor(Date.now() / 1000) - opts.sinceDays * 86400;
  const res = await db().execute(sql`
    SELECT
      engine_id,
      COUNT(*)::text AS total,
      SUM(CASE WHEN brand_mentioned THEN 1 ELSE 0 END)::text AS mentions,
      SUM(CASE WHEN our_citation_url IS NOT NULL THEN 1 ELSE 0 END)::text AS citations,
      COALESCE(SUM(cost_cents), 0)::text AS spend
    FROM seo_prompt_snapshots
    WHERE captured_at >= ${since}
    GROUP BY engine_id
    ORDER BY engine_id
  `);
  return unwrap(res).map((r) => {
    const total = Number(r.total);
    const mentions = Number(r.mentions);
    const citations = Number(r.citations);
    return {
      engineId: r.engine_id as string,
      totalSnapshots: total,
      brandMentions: mentions,
      citations,
      brandMentionRate: total > 0 ? mentions / total : 0,
      citationRate: total > 0 ? citations / total : 0,
      totalSpendCents: Number(r.spend),
    };
  });
}

export async function getWeeklySpendCents(): Promise<number> {
  const since = Math.floor(Date.now() / 1000) - 7 * 86400;
  const res = await db().execute(sql`
    SELECT COALESCE(SUM(cost_cents), 0)::text AS total
    FROM seo_prompt_snapshots
    WHERE captured_at >= ${since}
  `);
  const rows = unwrap(res);
  return Number(rows[0]?.total ?? 0);
}

export interface CitationSnapshotRow {
  id: string;
  capturedAt: number;
  engineId: string;
  promptText: string;
  ourCitationUrl: string;
  sentiment: string | null;
  brandMentioned: boolean;
}

export async function listCitationSnapshots(opts: {
  sinceDays?: number;
  limit?: number;
}): Promise<CitationSnapshotRow[]> {
  const since =
    opts.sinceDays != null
      ? Math.floor(Date.now() / 1000) - opts.sinceDays * 86400
      : 0;
  const rows = await db()
    .select({
      id: seoPromptSnapshots.id,
      capturedAt: seoPromptSnapshots.capturedAt,
      engineId: seoPromptSnapshots.engineId,
      promptText: seoPrompts.prompt,
      ourCitationUrl: seoPromptSnapshots.ourCitationUrl,
      sentiment: seoPromptSnapshots.sentiment,
      brandMentioned: seoPromptSnapshots.brandMentioned,
    })
    .from(seoPromptSnapshots)
    .innerJoin(seoPrompts, eq(seoPromptSnapshots.promptId, seoPrompts.id))
    .where(
      and(
        isNotNull(seoPromptSnapshots.ourCitationUrl),
        gte(seoPromptSnapshots.capturedAt, since),
      ),
    )
    .orderBy(desc(seoPromptSnapshots.capturedAt))
    .limit(opts.limit ?? 200);
  return rows as CitationSnapshotRow[];
}
