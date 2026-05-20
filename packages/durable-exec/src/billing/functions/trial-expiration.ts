/**
 * Daily trial and subscription expiration check.
 * Cron: daily 00:00 UTC (0 0 * * *)
 */

import { runTrialExpirationCheck } from "@repo/billing";
import { inngest } from "../../client";

export const billingTrialExpirationFunction = inngest.createFunction(
  {
    id: "billing-trial-expiration",
    retries: 0,
    concurrency: { limit: 1 },
    triggers: [
      { cron: "0 0 * * *" },
      { event: "cron/billing-trial-expiration" },
    ],
  },
  async ({ step }) => {
    const result = await step.run("trial-expiration", () =>
      runTrialExpirationCheck(),
    );
    console.log(
      `[billing-trial-expiration] checked=${result.checked} expired=${result.expired}`,
    );
    return result;
  },
);
