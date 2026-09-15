import {
  RATE_LIMITS,
  type V1Plan,
  v1Error,
} from "@repo/api-schemas/v1/contract";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Per-key rate limiting for the public V1 plane.
 *
 * Two fixed windows (minute + day) backed by Upstash Redis; search-style
 * requests pass a costMultiplier that shrinks the effective max. When Redis
 * is not configured (local dev) the limiter fails open with static headers.
 */

export type V1RateLimitResult =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; response: Response };

const MINUTE_WINDOW = "60 s";
const DAY_WINDOW = "1 d";

let cachedRedis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  cachedRedis = null;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    cachedRedis = Redis.fromEnv();
  }
  return cachedRedis;
}

function staticHeaders(limitPerMinute: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limitPerMinute),
    "X-RateLimit-Remaining": String(limitPerMinute),
    "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 60),
  };
}

export function effectiveLimits(plan: V1Plan, costMultiplier: number) {
  const limits = RATE_LIMITS[plan];
  return {
    perMinute: Math.max(1, Math.floor(limits.perMinute / costMultiplier)),
    perDay: Math.max(1, Math.floor(limits.perDay / costMultiplier)),
  };
}

export async function enforceV1RateLimit(
  plan: V1Plan,
  keyId: string,
  costMultiplier = 1,
): Promise<V1RateLimitResult> {
  const { perMinute, perDay } = effectiveLimits(plan, costMultiplier);
  const redis = getRedis();
  if (!redis) return { ok: true, headers: staticHeaders(perMinute) };

  const minute = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(perMinute, MINUTE_WINDOW),
    prefix: "openwhispr:v1:rl:minute",
  });
  const day = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(perDay, DAY_WINDOW),
    prefix: "openwhispr:v1:rl:day",
  });

  try {
    const [minuteRes, dayRes] = await Promise.all([
      minute.limit(keyId),
      day.limit(keyId),
    ]);
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(minuteRes.limit),
      "X-RateLimit-Remaining": String(minuteRes.remaining),
      "X-RateLimit-Reset": String(Math.ceil(minuteRes.reset / 1000)),
    };

    const failed = !minuteRes.success
      ? minuteRes
      : !dayRes.success
        ? dayRes
        : null;
    if (failed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((failed.reset - Date.now()) / 1000),
      );
      return {
        ok: false,
        response: v1Error(429, "rate_limited", "Rate limit exceeded", {
          ...headers,
          "Retry-After": String(retryAfter),
        }),
      };
    }
    return { ok: true, headers };
  } catch (error) {
    console.error("[v1] rate limit check failed; failing open", error);
    return { ok: true, headers: staticHeaders(perMinute) };
  }
}
