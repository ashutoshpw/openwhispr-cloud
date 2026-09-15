import { z } from "zod";
import {
  type V1ErrorCode,
  v1Error,
  v1List,
  v1ListQuery,
  v1NoContent,
  v1Ok,
} from "../envelope";

/**
 * Public V1 plane — the contract published in the desktop repo's
 * agent-skills/openwhispr-api/SKILL.md. Served at api.openwhispr.com/api/v1
 * and exposed as MCP tools by apps/mcp.
 */

export { v1Error, v1List, v1ListQuery, v1NoContent, v1Ok };
export type { V1ErrorCode };

export const V1_SCOPES = {
  personal: ["notes:read", "notes:write", "transcriptions:read", "usage:read"],
  workspace: [
    "workspace:notes:read",
    "workspace:notes:write",
    "workspace:folders:read",
    "workspace:folders:write",
    "workspace:transcriptions:read",
    "workspace:*",
  ],
} as const;

export type V1Scope =
  | (typeof V1_SCOPES)["personal"][number]
  | (typeof V1_SCOPES)["workspace"][number];

// ---------------------------------------------------------------------------
// Rate limits (per API key; search costs 5x)
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  free: { perMinute: 30, perDay: 1_000 },
  pro: { perMinute: 120, perDay: 10_000 },
  business: { perMinute: 300, perDay: 50_000 },
} as const;

export type V1Plan = keyof typeof RATE_LIMITS;

export function rateLimitHeaders(
  plan: V1Plan,
  remaining: number,
  resetAtUnix: number,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(RATE_LIMITS[plan].perMinute),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetAtUnix),
  };
}

// ---------------------------------------------------------------------------
// Spaces (workspace keys only)
// ---------------------------------------------------------------------------

export const v1Space = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  emoji: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const v1NoteListQuery = v1ListQuery.extend({
  folder_id: z.string().uuid().optional(),
  /** Required for workspace keys, rejected for personal keys. */
  space_id: z.string().uuid().optional(),
});

export const v1Note = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  enhanced_content: z.string().nullable(),
  note_type: z.string(),
  folder_id: z.string().nullable(),
  space_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const v1NoteCreateRequest = z.object({
  content: z.string().min(1),
  title: z.string().max(500).optional(),
  enhanced_content: z.string().optional(),
  note_type: z.enum(["personal", "meeting", "upload"]).optional(),
  folder_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
});

export const v1NoteUpdateRequest = z
  .object({
    title: z.string().max(500),
    content: z.string().min(1),
    enhanced_content: z.string(),
    folder_id: z.string().uuid(),
  })
  .partial();

export const v1NoteSearchRequest = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).default(20),
  space_id: z.string().uuid().optional(),
});

export const v1NoteSearchResponse = z.object({
  data: z.array(v1Note.extend({ score: z.number() })),
  has_more: z.boolean(),
});

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export const v1Folder = z.object({
  id: z.string(),
  name: z.string(),
  sort_order: z.number(),
  space_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const v1FolderCreateRequest = z.object({
  name: z.string().min(1).max(100),
  sort_order: z.number().int().optional(),
  space_id: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Transcriptions
// ---------------------------------------------------------------------------

export const v1Transcription = z.object({
  id: z.string(),
  text: z.string(),
  word_count: z.number().nullable(),
  source: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  language: z.string().nullable(),
  audio_duration_ms: z.number().nullable(),
  processing_ms: z.number().nullable(),
  created_at: z.string(),
});

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export const v1Usage = z.object({
  words_used: z.number(),
  words_remaining: z.number(),
  limit: z.number(),
  plan: z.enum(["free", "pro", "business"]),
  is_subscribed: z.boolean(),
  current_period_end: z.string().nullable(),
  billing_interval: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Errors the desktop pins (surfaced verbatim through the sync error parser)
// ---------------------------------------------------------------------------

export const NOTE_VERSION_CONFLICT = "note_version_conflict" as const;
export const LIMIT_REACHED = "LIMIT_REACHED" as const;
export const NO_SPEECH_DETECTED = "NO_SPEECH_DETECTED" as const;
