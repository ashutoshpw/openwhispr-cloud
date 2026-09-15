import type { SyncListQuery } from "@repo/api-schemas/envelope";
import type { CloudFolder, CloudNote } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq, gt, isNull, lt, or, sql } from "@repo/database";
import type { folder, note } from "@repo/database/schema";

export type NoteRow = typeof note.$inferSelect;
export type FolderRow = typeof folder.$inferSelect;

/** DB row → desktop CloudNote (src/services/NotesService.ts field names). */
export function toCloudNote(row: NoteRow): CloudNote {
  return {
    id: row.id,
    client_note_id: row.clientNoteId,
    title: row.title,
    content: row.content,
    enhanced_content: row.enhancedContent,
    note_type: row.noteType,
    enhancement_prompt: row.enhancementPrompt,
    source_file: row.sourceFile,
    audio_duration_seconds: row.audioDurationSeconds,
    folder_id: row.folderId,
    transcript: row.transcript,
    enhanced_at_content_hash: row.enhancedAtContentHash,
    participants: row.participants,
    calendar_event_id: row.calendarEventId,
    diarization_enabled: row.diarizationEnabled,
    expected_speaker_count: row.expectedSpeakerCount,
    workspace_id: row.organizationId,
    space_id: row.spaceId,
    user_id: row.userId,
    created_by_user_id: row.createdByUserId,
    updated_by_user_id: row.updatedByUserId ?? row.userId,
    deleted_at: row.deletedAt ? row.deletedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toCloudFolder(row: FolderRow): CloudFolder {
  return {
    id: row.id,
    client_folder_id: row.clientFolderId,
    name: row.name,
    sort_order: row.sortOrder,
    workspace_id: row.organizationId,
    space_id: row.spaceId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/**
 * Keyset filter over updated_at with a tiebreaking id (the desktop sends
 * before/since timestamps plus optional before_id/since_id).
 */
export function keysetFilter(
  column: typeof note.updatedAt,
  idColumn: typeof note.id,
  q: SyncListQuery,
) {
  if (q.before) {
    const before = new Date(q.before);
    return q.before_id
      ? or(
          lt(column, before),
          and(eq(column, before), lt(idColumn, q.before_id)),
        )
      : lt(column, before);
  }
  if (q.since) {
    const since = new Date(q.since);
    return q.since_id
      ? or(gt(column, since), and(eq(column, since), gt(idColumn, q.since_id)))
      : gt(column, since);
  }
  return undefined;
}

export { and, eq, isNull, sql };
