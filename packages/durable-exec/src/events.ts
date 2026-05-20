/**
 * Typed Inngest event registry for @repo/durable-exec.
 * All event names and their data shapes are declared here so callers get
 * compile-time safety when doing `inngest.send(...)`.
 */

export type DurableEvents = {
  /** Daily trial/subscription expiration → readonly workspaces */
  "cron/billing-trial-expiration": {
    data: Record<string, never>;
  };
  /** Daily cleanup of stale pending workspaces */
  "cron/billing-cleanup-pending": {
    data: Record<string, never>;
  };
  /** Daily activation of referrals past refund approval window */
  "cron/billing-referral-window": {
    data: Record<string, never>;
  };
  /** Trigger a rank-snapshot run (optionally for a single keyword) */
  "cron/seo-rank-snapshot": {
    data: {
      triggeredBy?: "scheduled" | "manual";
      keywordId?: string;
    };
  };
  /** Trigger a GSC data sync */
  "cron/seo-gsc-sync": {
    data: {
      triggeredBy?: "scheduled" | "manual";
      daysBack?: number;
    };
  };
  /** Trigger a prompt-snapshot run (optionally for a single prompt/engine) */
  "cron/seo-prompt-snapshot": {
    data: {
      triggeredBy?: "scheduled" | "manual";
      promptId?: string;
      engineId?: string;
    };
  };
  /** Trigger a Google AIO presence snapshot */
  "cron/seo-aio-snapshot": {
    data: {
      triggeredBy?: "scheduled" | "manual";
      keywordId?: string;
    };
  };
  /** Trigger nightly AIEO secret validation */
  "cron/seo-secret-validation": {
    data: Record<string, never>;
  };
  /** Trigger weekly competitor inference rollup */
  "cron/seo-competitor-rollup": {
    data: Record<string, never>;
  };
  /** Trigger daily PostHog AI-referrer rollup */
  "cron/seo-posthog-referrer-rollup": {
    data: Record<string, never>;
  };
  /** Emitted internally when the weekly AIEO budget is exceeded */
  "cron/seo-aieo-budget-exceeded": {
    data: {
      capCents: number;
      spentCents: number;
      attempted: number;
    };
  };
};
