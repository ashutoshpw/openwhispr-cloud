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

type Handler = (req: Request) => Promise<Response>;

const handler = serve({
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
}) as unknown as {
  GET: Handler;
  POST: Handler;
  PUT: Handler;
};

export const GET = (req: Request) => handler.GET(req);
export const POST = (req: Request) => handler.POST(req);
export const PUT = (req: Request) => handler.PUT(req);
