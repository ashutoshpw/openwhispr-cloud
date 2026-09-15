import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { noteBatchCreateRequest } from "@repo/api-schemas/sync/notes";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { note } from "@repo/database/schema";

type Created = { client_note_id: string; id: string; updated_at?: string };

/**
 * POST /api/notes/batch-create
 * → 201 { created: [{ client_note_id, id, updated_at? }] }
 * Per-item idempotency on client_note_id; existing rows are skipped.
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = noteBatchCreateRequest.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid batch payload");
    }

    const created: Created[] = [];

    for (const item of parsed.data.notes) {
      if (item.client_note_id) {
        const [existing] = await db()
          .select()
          .from(note)
          .where(
            and(
              eq(note.userId, user.id),
              eq(note.clientNoteId, item.client_note_id),
            ),
          )
          .limit(1);
        if (existing) {
          created.push({
            client_note_id: item.client_note_id,
            id: existing.id,
            updated_at: existing.updatedAt.toISOString(),
          });
          continue;
        }
      }

      const now = new Date();
      const [row] = await db()
        .insert(note)
        .values({
          id: crypto.randomUUID(),
          clientNoteId: item.client_note_id ?? null,
          userId: user.id,
          organizationId: item.workspace_id ?? null,
          spaceId: item.space_id ?? null,
          title: item.title ?? null,
          content: item.content,
          enhancedContent: item.enhanced_content ?? null,
          enhancementPrompt: item.enhancement_prompt ?? null,
          noteType: item.note_type ?? "personal",
          sourceFile: item.source_file ?? null,
          audioDurationSeconds: item.audio_duration_seconds ?? null,
          participants: item.participants ?? null,
          calendarEventId: item.calendar_event_id ?? null,
          diarizationEnabled: item.diarization_enabled ?? null,
          expectedSpeakerCount: item.expected_speaker_count ?? null,
          transcript: item.transcript ?? null,
          enhancedAtContentHash: item.enhanced_at_content_hash ?? null,
          folderId: item.folder_id ?? null,
          createdByUserId: user.id,
          updatedByUserId: user.id,
          createdAt: item.created_at ? new Date(item.created_at) : now,
          updatedAt: item.updated_at ? new Date(item.updated_at) : now,
        })
        .returning();

      created.push({
        client_note_id: row.clientNoteId ?? "",
        id: row.id,
        updated_at: row.updatedAt.toISOString(),
      });
    }

    return syncCreated({ created });
  });
}
