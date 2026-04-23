import { db, sql } from "@repo/database";
import { unwrap } from "./_unwrap";

export async function upsertBotHit(
  date: string,
  userAgent: string,
  path: string,
  increment = 1,
): Promise<void> {
  await db().execute(sql`
    INSERT INTO seo_ai_bot_hits (date, user_agent, path, hits, last_seen_at)
    VALUES (${date}, ${userAgent}, ${path}, ${increment}, EXTRACT(epoch FROM now())::bigint)
    ON CONFLICT (date, user_agent, path) DO UPDATE SET
      hits = seo_ai_bot_hits.hits + EXCLUDED.hits,
      last_seen_at = EXCLUDED.last_seen_at
  `);
}

export interface BotHitSeriesRow {
  date: string;
  userAgent: string;
  path: string;
  hits: number;
}

export async function getBotCrawlSeries(opts: {
  sinceDays: number;
}): Promise<BotHitSeriesRow[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - opts.sinceDays);
  const since = cutoff.toISOString().split("T")[0] as string;

  const res = await db().execute(sql`
    SELECT date, user_agent, path, hits
    FROM seo_ai_bot_hits
    WHERE date >= ${since}
    ORDER BY date DESC, hits DESC
    LIMIT 500
  `);
  return unwrap(res).map((r) => ({
    date: r.date as string,
    userAgent: r.user_agent as string,
    path: r.path as string,
    hits: Number(r.hits),
  }));
}

export async function getBotCrawlTotals(opts: {
  sinceDays: number;
}): Promise<Array<{ userAgent: string; hits: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - opts.sinceDays);
  const since = cutoff.toISOString().split("T")[0] as string;

  const res = await db().execute(sql`
    SELECT user_agent, SUM(hits)::text AS hits
    FROM seo_ai_bot_hits
    WHERE date >= ${since}
    GROUP BY user_agent
    ORDER BY SUM(hits) DESC
  `);
  return unwrap(res).map((r) => ({
    userAgent: r.user_agent as string,
    hits: Number(r.hits),
  }));
}
