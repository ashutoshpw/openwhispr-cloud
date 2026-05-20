/**
 * Daily activation of referrals past the refund approval window.
 * Cron: daily 01:00 UTC (0 1 * * *)
 */

import { activateRipeRefundPeriodReferrals } from "@repo/billing";
import { inngest } from "../../client";

export const billingReferralWindowFunction = inngest.createFunction(
  {
    id: "billing-referral-window",
    retries: 0,
    concurrency: { limit: 1 },
    triggers: [
      { cron: "0 1 * * *" },
      { event: "cron/billing-referral-window" },
    ],
  },
  async ({ step }) => {
    const activated = await step.run("referral-window", () =>
      activateRipeRefundPeriodReferrals(),
    );
    console.log(
      `[billing-referral-window] activated ${activated.length} referral(s)`,
    );
    return { activated };
  },
);
