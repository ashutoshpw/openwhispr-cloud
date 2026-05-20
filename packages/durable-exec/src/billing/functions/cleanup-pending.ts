/**
 * Daily cleanup of abandoned pending workspaces.
 * Cron: daily 12:00 UTC (0 12 * * *)
 */

import { runPendingOrganizationCleanup } from "@repo/billing";
import { inngest } from "../../client";

export const billingCleanupPendingFunction = inngest.createFunction(
  {
    id: "billing-cleanup-pending",
    retries: 0,
    concurrency: { limit: 1 },
    triggers: [
      { cron: "0 12 * * *" },
      { event: "cron/billing-cleanup-pending" },
    ],
  },
  async ({ step }) => {
    const result = await step.run("cleanup-pending", () =>
      runPendingOrganizationCleanup(),
    );
    console.log(
      `[billing-cleanup-pending] found=${result.found} deleted=${result.deleted}`,
    );
    return result;
  },
);
