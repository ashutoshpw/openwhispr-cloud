/**
 * @repo/durable-exec/next
 * Exports a fully-wired Inngest serve() handler for Next.js App Router.
 * Import GET/POST/PUT from this module in your api/inngest/route.ts.
 */

import { serve } from "inngest/next";
import { inngest } from "./client";
import { seoAioSnapshotFunction } from "./seo/functions/aio-snapshot";
import { seoCompetitorRollupFunction } from "./seo/functions/competitor-rollup";
import { seoGscSyncFunction } from "./seo/functions/gsc-sync";
import { seoPosthogReferrerRollupFunction } from "./seo/functions/posthog-referrer-rollup";
import { seoPromptSnapshotFunction } from "./seo/functions/prompt-snapshot";
import { seoRankSnapshotFunction } from "./seo/functions/rank-snapshot";
import { seoSecretValidationFunction } from "./seo/functions/secret-validation";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    seoRankSnapshotFunction,
    seoGscSyncFunction,
    seoPromptSnapshotFunction,
    seoAioSnapshotFunction,
    seoSecretValidationFunction,
    seoCompetitorRollupFunction,
    seoPosthogReferrerRollupFunction,
  ],
});
