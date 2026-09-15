import { v1Error } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { space } from "@repo/database/schema";
import type { folder, note, transcription } from "@repo/database/schema";
import type { V1Auth } from "./v1-auth";

/**
 * Shared mapping / cursor / workspace-space helpers for the V1 note, folder,
 * space, and transcription routes.
 */

type SpaceRow = typeof space.$inferSelect;
type NoteRow = typeof note.$inferSelect;
type FolderRow = typeof folder.$inferSelect;
type TranscriptionRow = typeof transcription.$inferSelect;

export function toV1Space(row: SpaceRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    emoji: row.emoji,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toV1Note(row: NoteRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    enhanced_content: row.enhancedContent,
    note_type: row.noteType,
    folder_id: row.folderId,
    space_id: row.spaceId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toV1Folder(row: FolderRow) {
  return {
    id: row.id,
    name: row.name,
    sort_order: row.sortOrder,
    space_id: row.spaceId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toV1Transcription(row: TranscriptionRow) {
  return {
    id: row.id,
    text: row.text,
    word_count: row.wordCount,
    source: row.source,
    provider: row.provider,
    model: row.model,
    language: row.language,
    audio_duration_ms: row.audioDurationMs,
    processing_ms: row.processingMs,
    created_at: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Cursors
// ---------------------------------------------------------------------------

/** Notes paginate over an `updated_at:id` composite, base64url-encoded. */
export function encodeNoteCursor(
  row: Pick<NoteRow, "updatedAt" | "id">,
): string {
  return Buffer.from(
    `${row.updatedAt.toISOString()}:${row.id}`,
    "utf8",
  ).toString("base64url");
}

export function decodeNoteCursor(
  value: string,
): { updatedAt: Date; id: string } | null {
  let raw: string;
  try {
    raw = Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sep = raw.lastIndexOf(":");
  if (sep <= 0) return null;
  const updatedAt = new Date(raw.slice(0, sep));
  const id = raw.slice(sep + 1);
  if (Number.isNaN(updatedAt.getTime()) || !id) return null;
  return { updatedAt, id };
}

export function encodeTimestampCursor(at: Date): string {
  return Buffer.from(at.toISOString(), "utf8").toString("base64url");
}

/** Accepts the base64url form we issue and the legacy raw ISO timestamp. */
export function decodeTimestampCursor(value: string): Date | null {
  const candidates = [value];
  try {
    candidates.push(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    // fall through to the raw form
  }
  for (const candidate of candidates) {
    const at = new Date(candidate);
    if (!Number.isNaN(at.getTime())) return at;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Workspace space resolution
// ---------------------------------------------------------------------------

export async function resolveWorkspaceSpace(
  auth: V1Auth,
  spaceId: string,
): Promise<SpaceRow | null> {
  if (!auth.organizationId) return null;
  const [row] = await db()
    .select()
    .from(space)
    .where(
      and(eq(space.id, spaceId), eq(space.organizationId, auth.organizationId)),
    )
    .limit(1);
  return row ?? null;
}

export function validationError(message: string): Response {
  return v1Error(400, "validation_error", message);
}

export function notFoundError(message: string): Response {
  return v1Error(404, "not_found", message);
}
