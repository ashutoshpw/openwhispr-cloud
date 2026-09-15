import { notFoundError, toV1Note, validationError } from "@/lib/v1";
import { type V1Auth, withV1Key } from "@/lib/v1-auth";
import {
  v1NoContent,
  v1NoteUpdateRequest,
  v1Ok,
} from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, eq, isNull } from "@repo/database";
import { note } from "@repo/database/schema";

/**
 * GET/PATCH/DELETE /api/v1/notes/{id} — the note's space is resolved from the
 * row itself: personal keys act on their own private notes, workspace keys on
 * any team-space note in their workspace.
 */
async function loadAccessibleNote(id: string, auth: V1Auth) {
  const [row] = await db()
    .select()
    .from(note)
    .where(and(eq(note.id, id), isNull(note.deletedAt)))
    .limit(1);
  if (!row) return null;
  if (auth.kind === "personal") {
    return row.userId === auth.userId && row.organizationId === null
      ? row
      : null;
  }
  return row.organizationId === auth.organizationId && row.spaceId !== null
    ? row
    : null;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return withV1Key(
    request,
    { personal: "notes:read", workspace: "workspace:notes:read" },
    async (auth) => {
      const row = await loadAccessibleNote(id, auth);
      if (!row) return notFoundError("Note not found");
      return v1Ok(toV1Note(row));
    },
  );
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = v1NoteUpdateRequest.safeParse(body);

  return withV1Key(
    request,
    { personal: "notes:write", workspace: "workspace:notes:write" },
    async (auth) => {
      if (!parsed.success) return validationError("Invalid note payload");
      const row = await loadAccessibleNote(id, auth);
      if (!row) return notFoundError("Note not found");

      const input = parsed.data;
      const [updated] = await db()
        .update(note)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.content !== undefined ? { content: input.content } : {}),
          ...(input.enhanced_content !== undefined
            ? { enhancedContent: input.enhanced_content }
            : {}),
          ...(input.folder_id !== undefined
            ? { folderId: input.folder_id }
            : {}),
          updatedByUserId: auth.userId,
        })
        .where(eq(note.id, row.id))
        .returning();

      return v1Ok(toV1Note(updated));
    },
  );
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return withV1Key(
    request,
    { personal: "notes:write", workspace: "workspace:notes:write" },
    async (auth) => {
      const row = await loadAccessibleNote(id, auth);
      if (!row) return notFoundError("Note not found");

      await db()
        .update(note)
        .set({ deletedAt: new Date(), updatedByUserId: auth.userId })
        .where(eq(note.id, row.id));

      return v1NoContent();
    },
  );
}
