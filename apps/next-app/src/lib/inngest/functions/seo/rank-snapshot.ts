/**
 * Weekly SEO rank-snapshot cron.
 *
 * For each active keyword, query DataForSEO live SERP for the configured
 * target domain and record one row in seo_keyword_snapshots. Idempotent per
 * UTC day.
 *
 * Cron: Mondays 04:00 UTC (`0 4 * * 1`)
 * Manual trigger: `cron/seo-rank-snapshot` event (optionally with keywordId).
 */

import { getKeywordById, listKeywords } from "@/lib/dal/seo/keywords";
import { hasSnapshotOnDate, insertSnapshot } from "@/lib/dal/seo/snapshots";
import { fetchSerpRank } from "@/lib/dataforseo/serp-client";
import { inngest } from "../../client";

const TARGET_DOMAIN = process.env.SEO_TARGET_DOMAIN || "example.com";
const COUNTRY = process.env.SEO_TARGET_COUNTRY || "US";

interface SnapshotRunResult {
  attempted: number;
  inserted: number;
  skipped: number;
  failed: number;
  totalCost: number;
  errors: Array<{ keyword: string; error: string }>;
}

export const seoRankSnapshotFunction = inngest.createFunction(
  {
    id: "seo-rank-snapshot",
    retries: 1,
    concurrency: { limit: 1 }, // serialize so we don't double-charge DataForSEO
    triggers: [{ cron: "0 4 * * 1" }, { event: "cron/seo-rank-snapshot" }],
  },
  async ({ event, step }) => {
    const eventData = (event?.data ?? {}) as {
      triggeredBy?: "scheduled" | "manual";
      keywordId?: string;
    };
    const triggeredBy = eventData.triggeredBy ?? "scheduled";
    console.log(`[seo-rank-snapshot] start (trigger=${triggeredBy})`);

    const keywords = await step.run("load-keywords", async () => {
      if (eventData.keywordId) {
        const k = await getKeywordById(eventData.keywordId);
        return k ? [k] : [];
      }
      return listKeywords({ activeOnly: true });
    });

    if (keywords.length === 0) {
      console.log("[seo-rank-snapshot] no keywords to process");
      return { triggeredBy, processed: 0 };
    }

    const result: SnapshotRunResult = {
      attempted: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      totalCost: 0,
      errors: [],
    };

    const today = Math.floor(Date.now() / 1000);

    for (const kw of keywords) {
      result.attempted++;

      const stepId = `snapshot-${kw.id}`;
      const outcome = await step.run(stepId, async () => {
        try {
          const already = await hasSnapshotOnDate(kw.id, today);
          if (already) return { kind: "skipped" as const };

          const rank = await fetchSerpRank({
            keyword: kw.keyword,
            targetDomain: TARGET_DOMAIN,
            country: COUNTRY,
          });

          await insertSnapshot({
            keywordId: kw.id,
            position: rank.position,
            rankingUrl: rank.rankingUrl,
            source: "dataforseo",
          });

          return {
            kind: "inserted" as const,
            cost: rank.cost,
            position: rank.position,
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { kind: "failed" as const, error: msg, keyword: kw.keyword };
        }
      });

      if (outcome.kind === "inserted") {
        result.inserted++;
        result.totalCost += outcome.cost ?? 0;
      } else if (outcome.kind === "skipped") {
        result.skipped++;
      } else {
        result.failed++;
        result.errors.push({ keyword: outcome.keyword, error: outcome.error });
      }
    }

    console.log(
      `[seo-rank-snapshot] done attempted=${result.attempted} inserted=${result.inserted} ` +
        `skipped=${result.skipped} failed=${result.failed} cost=$${result.totalCost.toFixed(4)}`,
    );

    return { triggeredBy, ...result };
  },
);
