import { z } from "zod";

/**
 * Response envelopes shared by every OpenWhispr Cloud API surface.
 *
 * Two distinct contracts exist (see the desktop repo's
 * src/helpers/cloudApiRequest.js and agent-skills/openwhispr-api/SKILL.md):
 *
 * - Sync plane (/api/*, desktop + dashboard): the response body IS the
 *   resource; errors use { error, code, data, minAppVersion }.
 * - Public V1 plane (/api/v1/*, CLI/MCP/integrations): resources are wrapped
 *   in { data }, lists add { has_more, next_cursor }, errors are
 *   { error: { code, message } }.
 */

// ---------------------------------------------------------------------------
// Sync plane
// ---------------------------------------------------------------------------

export const syncErrorBody = z.object({
  error: z.union([
    z.string(),
    z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  ]),
  code: z.string().optional(),
  data: z.unknown().optional(),
  minAppVersion: z.string().optional(),
});

export type SyncErrorBody = z.infer<typeof syncErrorBody>;

export function syncOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function syncCreated<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

export function syncNoContent(): Response {
  return new Response(null, { status: 204 });
}

export interface SyncErrorInit {
  code?: string;
  details?: unknown;
  minAppVersion?: string;
}

export function syncError(
  status: number,
  message: string,
  init?: SyncErrorInit,
): Response {
  return Response.json(
    {
      error: { message },
      ...(init?.code ? { code: init.code } : {}),
      ...(init?.details !== undefined ? { data: init.details } : {}),
      ...(init?.minAppVersion ? { minAppVersion: init.minAppVersion } : {}),
    },
    { status },
  );
}

// ---------------------------------------------------------------------------
// Public V1 plane
// ---------------------------------------------------------------------------

export const V1_ERROR_CODES = [
  "validation_error",
  "invalid_api_key",
  "forbidden",
  "not_found",
  "method_not_allowed",
  "conflict",
  "rate_limited",
  "internal_error",
] as const;

export type V1ErrorCode = (typeof V1_ERROR_CODES)[number];

export function v1Ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function v1List<T>(
  data: T[],
  opts: { hasMore: boolean; nextCursor?: string | null },
): Response {
  return Response.json({
    data,
    has_more: opts.hasMore,
    ...(opts.nextCursor ? { next_cursor: opts.nextCursor } : {}),
  });
}

export function v1NoContent(): Response {
  return new Response(null, { status: 204 });
}

export function v1Error(
  status: number,
  code: V1ErrorCode,
  message: string,
  headers?: Record<string, string>,
): Response {
  return Response.json({ error: { code, message } }, { status, headers });
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const isoTimestamp = z.string().datetime({ offset: true });

export const uuid = z.string().uuid();

/** Query pagination shared by sync list endpoints (desktop contract). */
export const syncListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(9999).optional(),
  before: z.string().optional(),
  since: z.string().optional(),
  before_id: z.string().optional(),
  since_id: z.string().optional(),
  cursor: z.string().optional(),
  cursor_id: z.string().optional(),
});

export type SyncListQuery = z.infer<typeof syncListQuery>;

/** V1 pagination (public contract). */
export const v1ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type V1ListQuery = z.infer<typeof v1ListQuery>;
