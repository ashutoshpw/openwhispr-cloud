import { db, desc, gte, seoReferrerAi, sql } from "@repo/database";
import { unwrap } from "./_unwrap";

export interface SeoReferrerAiRow {
  id: string;
  date: string;
  source: string;
  sessions: number;
  signups: number;
  fetchedAt: number;
}

export async function upsertReferrerDay(
  date: string,
  source: string,
  sessions: number,
  signups: number,
): Promise<void> {
  await db().execute(sql`
    INSERT INTO seo_referrer_ai (date, source, sessions, signups, fetched_at)
    VALUES (${date}, ${source}, ${sessions}, ${signups}, EXTRACT(epoch FROM now())::bigint)
    ON CONFLICT (date, source) DO UPDATE SET
      sessions = EXCLUDED.sessions,
      signups = EXCLUDED.signups,
      fetched_at = EXCLUDED.fetched_at
  `);
}

export interface ReferrerSeriesRow {
  date: string;
  source: string;
  sessions: number;
  signups: number;
}

export async function getReferrerSeries(opts: {
  sinceDays: number;
}): Promise<ReferrerSeriesRow[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - opts.sinceDays);
  const since = cutoff.toISOString().split("T")[0] as string;

  const rows = await db()
    .select({
      date: seoReferrerAi.date,
      source: seoReferrerAi.source,
      sessions: seoReferrerAi.sessions,
      signups: seoReferrerAi.signups,
    })
    .from(seoReferrerAi)
    .where(gte(seoReferrerAi.date, since))
    .orderBy(desc(seoReferrerAi.date), desc(seoReferrerAi.sessions));
  return rows as ReferrerSeriesRow[];
}

export async function getReferrerTotals(opts: {
  sinceDays: number;
}): Promise<Array<{ source: string; sessions: number; signups: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - opts.sinceDays);
  const since = cutoff.toISOString().split("T")[0] as string;

  const res = await db().execute(sql`
    SELECT source,
           SUM(sessions)::text AS sessions,
           SUM(signups)::text  AS signups
    FROM seo_referrer_ai
    WHERE date >= ${since}
    GROUP BY source
    ORDER BY SUM(sessions) DESC
  `);
  return unwrap(res).map((r) => ({
    source: r.source as string,
    sessions: Number(r.sessions),
    signups: Number(r.signups),
  }));
}
