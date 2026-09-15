import { toCloudNote } from "@/lib/notes";
import { withSession } from "@/lib/session";
import { syncCreated, syncError, syncOk } from "@repo/api-schemas/envelope";
import { cloudNote, noteInput } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { note } from "@repo/database/schema";

export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = noteInput.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid note payload");
    }
    const input = parsed.data;

    // Idempotent create: a client_note_id this user already owns returns the
    // existing row untouched.
    if (input.client_note_id) {
      const [existing] = await db()
        .select()
        .from(note)
        .where(
          and(
            eq(note.userId, user.id),
            eq(note.clientNoteId, input.client_note_id),
          ),
        )
        .limit(1);
      if (existing) return syncOk(toCloudNote(existing));
    }

    const now = new Date();
    const [row] = await db()
      .insert(note)
      .values({
        id: crypto.randomUUID(),
        clientNoteId: input.client_note_id ?? null,
        userId: user.id,
        organizationId: input.workspace_id ?? null,
        spaceId: input.space_id ?? null,
        title: input.title ?? null,
        content: input.content,
        enhancedContent: input.enhanced_content ?? null,
        enhancementPrompt: input.enhancement_prompt ?? null,
        noteType: input.note_type ?? "personal",
        sourceFile: input.source_file ?? null,
        audioDurationSeconds: input.audio_duration_seconds ?? null,
        participants: input.participants ?? null,
        calendarEventId: input.calendar_event_id ?? null,
        diarizationEnabled: input.diarization_enabled ?? null,
        expectedSpeakerCount: input.expected_speaker_count ?? null,
        transcript: input.transcript ?? null,
        enhancedAtContentHash: input.enhanced_at_content_hash ?? null,
        folderId: input.folder_id ?? null,
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: input.created_at ? new Date(input.created_at) : now,
        updatedAt: input.updated_at ? new Date(input.updated_at) : now,
      })
      .returning();

    return syncCreated(cloudNote.parse(toCloudNote(row)));
  });
}
