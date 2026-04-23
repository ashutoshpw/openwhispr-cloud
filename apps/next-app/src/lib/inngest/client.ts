import { Inngest } from "inngest";

/**
 * Single Inngest client for the SEO + AIEO stack. Event types are defined as
 * plain string literals; callers pass `data` matching the shape expected by
 * the relevant cron. v4 removed the `EventSchemas` helper — typed events are
 * now created per-call via `eventType()` if needed.
 */
export const inngest = new Inngest({
  id: "nextjs-starter",
});
