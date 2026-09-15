import { z } from "zod";

/**
 * Notes contract — field names mirror the desktop app's
 * src/services/NotesService.ts exactly.
 */

export const noteType = z.enum(["personal", "meeting", "upload"]);
export type NoteType = z.infer<typeof noteType>;

export const noteInput = z.object({
  client_note_id: z.string().nullish(),
  workspace_id: z.string().nullish(),
  space_id: z.string().nullish(),
  title: z.string().nullish(),
  content: z.string(),
  enhanced_content: z.string().nullish(),
  enhancement_prompt: z.string().nullish(),
  note_type: noteType.nullish(),
  source_file: z.string().nullish(),
  audio_duration_seconds: z.number().nullish(),
  participants: z.string().nullish(),
  calendar_event_id: z.string().nullish(),
  diarization_enabled: z.number().nullish(),
  expected_speaker_count: z.number().nullish(),
  transcript: z.string().nullish(),
  enhanced_at_content_hash: z.string().nullish(),
  folder_id: z.string().nullish(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  /** Optimistic-concurrency base on updates (409 note_version_conflict). */
  base_updated_at: z.string().optional(),
});

export type NoteInput = z.infer<typeof noteInput>;

export const cloudNote = z.object({
  id: z.string(),
  client_note_id: z.string().nullable(),
  title: z.string().nullable(),
  content: z.string(),
  enhanced_content: z.string().nullable(),
  note_type: z.string(),
  enhancement_prompt: z.string().nullable(),
  source_file: z.string().nullable(),
  audio_duration_seconds: z.number().nullable(),
  folder_id: z.string().nullable(),
  transcript: z.string().nullable(),
  enhanced_at_content_hash: z.string().nullable(),
  participants: z.string().nullable(),
  calendar_event_id: z.string().nullable(),
  diarization_enabled: z.number().nullable(),
  expected_speaker_count: z.number().nullable(),
  workspace_id: z.string().nullable(),
  space_id: z.string().nullable(),
  user_id: z.string().nullish(),
  created_by_user_id: z.string().nullish(),
  updated_by_user_id: z.string().nullable(),
  previous_space_id: z.string().nullish(),
  access_removed: z.boolean().nullish(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CloudNote = z.infer<typeof cloudNote>;

export const noteCreateRequest = noteInput;
export const noteBatchCreateRequest = z.object({ notes: z.array(noteInput) });
export const noteBatchCreateCreated = z.object({
  client_note_id: z.string(),
  id: z.string(),
  updated_at: z.string().optional(),
});
export const noteUpdateRequest = noteInput.partial().extend({
  id: z.string(),
});
export const noteDeleteRequest = z.object({ id: z.string() });
export const noteDeleteAllResponse = z.object({
  deleted: z.number(),
  errors: z.number(),
});
export const notesListResponse = z.object({ notes: z.array(cloudNote) });

/** Search — scope "all" opts into space results; space_id narrows further. */
export const noteSearchRequest = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  scope: z.literal("all").optional(),
  space_id: z.string().nullish(),
});
export const noteSearchResponse = z.object({
  notes: z.array(cloudNote.extend({ score: z.number() })),
});

// ---------------------------------------------------------------------------
// Folders contract (desktop FoldersService.ts)
// ---------------------------------------------------------------------------

export const folderInput = z.object({
  client_folder_id: z.string().nullish(),
  workspace_id: z.string().nullish(),
  space_id: z.string().nullish(),
  name: z.string().min(1).max(100),
  sort_order: z.number().int().optional(),
});

export const cloudFolder = z.object({
  id: z.string(),
  client_folder_id: z.string().nullable(),
  name: z.string(),
  sort_order: z.number(),
  workspace_id: z.string().nullable(),
  space_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CloudFolder = z.infer<typeof cloudFolder>;

export const folderBatchCreateRequest = z.object({
  folders: z.array(folderInput),
});
export const folderUpdateRequest = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().optional(),
});
export const folderDeleteRequest = z.object({ id: z.string() });
export const foldersListResponse = z.object({ folders: z.array(cloudFolder) });
