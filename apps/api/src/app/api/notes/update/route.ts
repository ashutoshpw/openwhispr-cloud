import { toCloudNote } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { cloudNote, noteUpdateRequest } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq, isNull } from "@repo/database";
import { note } from "@repo/database/schema";

/**
 * PATCH /api/notes/update
 * Body: { id, ...partial NoteInput } — base_updated_at drives optimistic
 * concurrency: 409 note_version_conflict with data.note when the server row
 * changed after the caller's acknowledged base.
 */
export async function PATCH(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = noteUpdateRequest.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid update payload");
    }
    const { id, base_updated_at, ...updates } = parsed.data;

    const [existing] = await db()
      .select()
      .from(note)
      .where(
        and(eq(note.id, id), eq(note.userId, user.id), isNull(note.deletedAt)),
      )
      .limit(1);
    if (!existing) return syncError(404, "Note not found");

    if (base_updated_at) {
      const base = new Date(base_updated_at);
      if (existing.updatedAt.getTime() > base.getTime()) {
        return syncError(409, "Note was modified by another device", {
          code: "note_version_conflict",
          details: { note: toCloudNote(existing) },
        });
      }
    }

    const patch: Partial<typeof note.$inferInsert> = {
      updatedByUserId: user.id,
    };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.content !== undefined) patch.content = updates.content;
    if (updates.enhanced_content !== undefined)
      patch.enhancedContent = updates.enhanced_content;
    if (updates.enhancement_prompt !== undefined)
      patch.enhancementPrompt = updates.enhancement_prompt;
    if (updates.note_type !== undefined)
      patch.noteType = updates.note_type ?? "personal";
    if (updates.source_file !== undefined)
      patch.sourceFile = updates.source_file;
    if (updates.audio_duration_seconds !== undefined)
      patch.audioDurationSeconds = updates.audio_duration_seconds;
    if (updates.participants !== undefined)
      patch.participants = updates.participants;
    if (updates.calendar_event_id !== undefined)
      patch.calendarEventId = updates.calendar_event_id;
    if (updates.diarization_enabled !== undefined)
      patch.diarizationEnabled = updates.diarization_enabled;
    if (updates.expected_speaker_count !== undefined)
      patch.expectedSpeakerCount = updates.expected_speaker_count;
    if (updates.transcript !== undefined) patch.transcript = updates.transcript;
    if (updates.enhanced_at_content_hash !== undefined)
      patch.enhancedAtContentHash = updates.enhanced_at_content_hash;
    if (updates.folder_id !== undefined) patch.folderId = updates.folder_id;
    if (updates.space_id !== undefined) patch.spaceId = updates.space_id;

    const [row] = await db()
      .update(note)
      .set(patch)
      .where(eq(note.id, id))
      .returning();

    return syncOk(cloudNote.parse(toCloudNote(row)));
  });
}
