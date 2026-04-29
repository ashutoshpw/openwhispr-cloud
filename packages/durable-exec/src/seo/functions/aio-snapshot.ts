/**
 * Weekly Google AI Overview presence cron.
 * Cron: Mondays 04:30 UTC (`30 4 * * 1`)
 */

import {
  getKeywordById,
  hasAioPresenceOnDate,
  insertAioPresence,
  listKeywords,
} from "@repo/database/dal/seo";
import { inngest } from "../../client";
import { googleAioEngine } from "../aieo/engines/google-aio";
import { getSecret } from "../aieo/secrets/store";
import { getSetting } from "../aieo/settings/store";

interface AioRunResult {
  attempted: number;
  inserted: number;
  skipped: number;
  failed: number;
  errors: Array<{ keyword: string; error: string }>;
}

export const seoAioSnapshotFunction = inngest.createFunction(
  {
    id: "seo-aio-snapshot",
    retries: 1,
    concurrency: { limit: 1 },
    triggers: [{ cron: "30 4 * * 1" }, { event: "cron/seo-aio-snapshot" }],
  },
  async ({ event, step }) => {
    const data = (event?.data ?? {}) as {
      triggeredBy?: "scheduled" | "manual";
      keywordId?: string;
    };
    const triggeredBy = data.triggeredBy ?? "scheduled";
    console.log(`[seo-aio-snapshot] start (trigger=${triggeredBy})`);

    const { keywords, targetDomain, apiKey } = await step.run(
      "load-context",
      async () => {
        const kws = data.keywordId
          ? await getKeywordById(data.keywordId).then((k) => (k ? [k] : []))
          : await listKeywords({ activeOnly: true });
        const target =
          (await getSetting<string>("targetDomain")) || "example.com";
        const auth = await getSecret("DATAFORSEO_AUTH");
        return { keywords: kws, targetDomain: target, apiKey: auth };
      },
    );

    if (!apiKey) {
      console.warn("[seo-aio-snapshot] DATAFORSEO_AUTH not set — aborting");
      return { triggeredBy, processed: 0, reason: "missing-credential" };
    }
    if (keywords.length === 0) {
      return { triggeredBy, processed: 0 };
    }

    const result: AioRunResult = {
      attempted: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    const today = Math.floor(Date.now() / 1000);

    for (const k of keywords) {
      result.attempted++;
      const outcome = await step.run(`aio-${k.id}`, async () => {
        try {
          const already = await hasAioPresenceOnDate(k.id, today);
          if (already) return { kind: "skipped" as const };

          const r = await googleAioEngine.query({
            prompt: k.keyword,
            targetDomain,
            competitors: [],
            apiKey,
          });

          await insertAioPresence({
            keywordId: k.id,
            hasAio: r.rawAnswer.length > 0,
            ourCited: !!r.ourCitationUrl,
            ourCitationUrl: r.ourCitationUrl,
            competitors: r.citations.filter(
              (c) => !c.domain.endsWith(targetDomain.toLowerCase()),
            ),
          });
          return { kind: "inserted" as const };
        } catch (e) {
          return {
            kind: "failed" as const,
            error: e instanceof Error ? e.message : String(e),
            keyword: k.keyword,
          };
        }
      });

      if (outcome.kind === "inserted") result.inserted++;
      else if (outcome.kind === "skipped") result.skipped++;
      else {
        result.failed++;
        result.errors.push({ keyword: outcome.keyword, error: outcome.error });
      }
    }

    console.log(
      `[seo-aio-snapshot] done attempted=${result.attempted} inserted=${result.inserted} ` +
        `skipped=${result.skipped} failed=${result.failed}`,
    );
    return { triggeredBy, ...result };
  },
);
