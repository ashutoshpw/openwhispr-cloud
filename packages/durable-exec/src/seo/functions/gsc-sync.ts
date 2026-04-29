/**
 * Daily Google Search Console sync.
 * Cron: every day 04:00 UTC (`0 4 * * *`)
 */

import { upsertGscRows } from "@repo/database/dal/seo";
import { inngest } from "../../client";
import { fetchGscRows } from "../gsc/client";

export const seoGscSyncFunction = inngest.createFunction(
  {
    id: "seo-gsc-sync",
    retries: 1,
    concurrency: { limit: 1 },
    triggers: [{ cron: "0 4 * * *" }, { event: "cron/seo-gsc-sync" }],
  },
  async ({ event, step }) => {
    const eventData = (event?.data ?? {}) as {
      triggeredBy?: "scheduled" | "manual";
      daysBack?: number;
    };
    const triggeredBy = eventData.triggeredBy ?? "scheduled";
    const daysBack = eventData.daysBack ?? 3;

    console.log(
      `[seo-gsc-sync] start (trigger=${triggeredBy}, daysBack=${daysBack})`,
    );

    const rows = await step.run("fetch-gsc", async () =>
      fetchGscRows({ daysBack }),
    );

    console.log(`[seo-gsc-sync] fetched ${rows.length} rows from GSC`);

    const upserted = await step.run("upsert-rows", async () =>
      upsertGscRows(rows),
    );

    console.log(`[seo-gsc-sync] done upserted=${upserted}`);

    return { triggeredBy, fetched: rows.length, upserted };
  },
);
