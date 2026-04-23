import { inngest } from "@/lib/inngest/client";
import { seoGscSyncFunction } from "@/lib/inngest/functions/seo/gsc-sync";
import { seoRankSnapshotFunction } from "@/lib/inngest/functions/seo/rank-snapshot";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [seoRankSnapshotFunction, seoGscSyncFunction],
});
