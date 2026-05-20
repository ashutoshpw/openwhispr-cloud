import { billingCleanupPendingFunction } from "./billing/functions/cleanup-pending";
import { billingReferralWindowFunction } from "./billing/functions/referral-window";
import { billingTrialExpirationFunction } from "./billing/functions/trial-expiration";
import { seoAioSnapshotFunction } from "./seo/functions/aio-snapshot";
import { seoCompetitorRollupFunction } from "./seo/functions/competitor-rollup";
import { seoGscSyncFunction } from "./seo/functions/gsc-sync";
import { seoPosthogReferrerRollupFunction } from "./seo/functions/posthog-referrer-rollup";
import { seoPromptSnapshotFunction } from "./seo/functions/prompt-snapshot";
import { seoRankSnapshotFunction } from "./seo/functions/rank-snapshot";
import { seoSecretValidationFunction } from "./seo/functions/secret-validation";

export const allFunctions = [
  billingTrialExpirationFunction,
  billingCleanupPendingFunction,
  billingReferralWindowFunction,
  seoRankSnapshotFunction,
  seoGscSyncFunction,
  seoPromptSnapshotFunction,
  seoAioSnapshotFunction,
  seoSecretValidationFunction,
  seoCompetitorRollupFunction,
  seoPosthogReferrerRollupFunction,
];
