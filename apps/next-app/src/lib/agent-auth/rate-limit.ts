import "server-only";

import { getRedis } from "@/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Spec defaults: per-IP 5/hour for anonymous, 60/hour for identity_assertion.
// Fail open when no Redis is configured (local dev / template state).
function create(
  limit: number,
  window: `${number} ${"s" | "m" | "h"}`,
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: "agent-auth",
  });
}

const anonymousLimiter = create(5, "1 h");
const assertionLimiter = create(60, "1 h");

export async function checkAgentIdentityRateLimit(
  ip: string | null,
  type: string,
): Promise<boolean> {
  const limiter = type === "anonymous" ? anonymousLimiter : assertionLimiter;
  if (!limiter || !ip) return true;
  try {
    const { success } = await limiter.limit(ip);
    return success;
  } catch {
    return true; // fail open on store errors
  }
}
