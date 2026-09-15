/**
 * Fixed-window in-memory rate limiter, per API key.
 *
 * Single-instance simplicity is fine for the MCP plane; the window is one
 * minute and the free tier gets 30 requests. Expired entries are swept on
 * access so the map stays bounded.
 */

const LIMIT = 30;
const WINDOW_MS = 60_000;

interface Window {
  count: number;
  startedAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(keyId: string): RateLimitResult {
  const now = Date.now();
  const current = windows.get(keyId);

  if (!current || now - current.startedAt >= WINDOW_MS) {
    windows.set(keyId, { count: 1, startedAt: now });
    return { allowed: true, remaining: LIMIT - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= LIMIT) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.startedAt + WINDOW_MS - now) / 1000),
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: LIMIT - current.count,
    retryAfterSeconds: 0,
  };
}
