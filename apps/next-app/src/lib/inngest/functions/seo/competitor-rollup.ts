/**
 * Weekly competitor inference cron. Refreshes seo_competitors from the last
 * 30 days of citations.
 *
 * Cron: Mondays 06:00 UTC (`0 6 * * 1`)
 */

import { inferCompetitorsFromRecentSnapshots } from "@/lib/aieo/competitor-inference";
import { inngest } from "../../client";

export const seoCompetitorRollupFunction = inngest.createFunction(
  {
    id: "seo-competitor-rollup",
    retries: 0,
    triggers: [{ cron: "0 6 * * 1" }, { event: "cron/seo-competitor-rollup" }],
  },
  async ({ step }) => {
    const result = await step.run("infer-competitors", () =>
      inferCompetitorsFromRecentSnapshots({ sinceDays: 30 }),
    );
    console.log(
      `[seo-competitor-rollup] done scanned=${result.domainsScanned} ` +
        `filtered=${result.noiseFiltered} upserted=${result.upserted}`,
    );
    return result;
  },
);
