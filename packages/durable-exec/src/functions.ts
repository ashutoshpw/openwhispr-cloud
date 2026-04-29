export { seoAioSnapshotFunction } from "./seo/functions/aio-snapshot";
export { seoCompetitorRollupFunction } from "./seo/functions/competitor-rollup";
export { seoGscSyncFunction } from "./seo/functions/gsc-sync";
export { seoPosthogReferrerRollupFunction } from "./seo/functions/posthog-referrer-rollup";
export { seoPromptSnapshotFunction } from "./seo/functions/prompt-snapshot";
export { seoRankSnapshotFunction } from "./seo/functions/rank-snapshot";
export { seoSecretValidationFunction } from "./seo/functions/secret-validation";

import { seoAioSnapshotFunction } from "./seo/functions/aio-snapshot";
import { seoCompetitorRollupFunction } from "./seo/functions/competitor-rollup";
import { seoGscSyncFunction } from "./seo/functions/gsc-sync";
import { seoPosthogReferrerRollupFunction } from "./seo/functions/posthog-referrer-rollup";
import { seoPromptSnapshotFunction } from "./seo/functions/prompt-snapshot";
import { seoRankSnapshotFunction } from "./seo/functions/rank-snapshot";
import { seoSecretValidationFunction } from "./seo/functions/secret-validation";

export const allFunctions = [
  seoRankSnapshotFunction,
  seoGscSyncFunction,
  seoPromptSnapshotFunction,
  seoAioSnapshotFunction,
  seoSecretValidationFunction,
  seoCompetitorRollupFunction,
  seoPosthogReferrerRollupFunction,
];
