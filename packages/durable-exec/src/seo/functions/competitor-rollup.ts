/**
 * Weekly competitor inference cron.
 * Cron: Mondays 06:00 UTC (`0 6 * * 1`)
 */

import { inngest } from "../../client";
import { inferCompetitorsFromRecentSnapshots } from "../aieo/competitor-inference";

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
