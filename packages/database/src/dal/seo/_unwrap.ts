/**
 * neon-http's db.execute returns either an array of rows directly or a
 * `{ rows: [...] }` shape depending on driver version. Normalize here so
 * DAL callers can consume one thing.
 */
export function unwrap(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const inner = (result as { rows?: unknown[] })?.rows ?? [];
  return inner as Record<string, unknown>[];
}
