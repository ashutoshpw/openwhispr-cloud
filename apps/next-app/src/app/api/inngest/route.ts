import { inngest } from "@/lib/inngest/client";
import { seoAioSnapshotFunction } from "@/lib/inngest/functions/seo/aio-snapshot";
import { seoCompetitorRollupFunction } from "@/lib/inngest/functions/seo/competitor-rollup";
import { seoGscSyncFunction } from "@/lib/inngest/functions/seo/gsc-sync";
import { seoPosthogReferrerRollupFunction } from "@/lib/inngest/functions/seo/posthog-referrer-rollup";
import { seoPromptSnapshotFunction } from "@/lib/inngest/functions/seo/prompt-snapshot";
import { seoRankSnapshotFunction } from "@/lib/inngest/functions/seo/rank-snapshot";
import { seoSecretValidationFunction } from "@/lib/inngest/functions/seo/secret-validation";
import { serve } from "inngest/next";
import type { NextRequest } from "next/server";

type InngestHandler = (req: NextRequest) => Promise<Response>;

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
  GET: InngestHandler;
  POST: InngestHandler;
  PUT: InngestHandler;
};

export const { GET, POST, PUT } = handler;
