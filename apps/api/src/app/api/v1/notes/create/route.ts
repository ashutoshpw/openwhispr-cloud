import {
  notFoundError,
  resolveWorkspaceSpace,
  toV1Note,
  validationError,
} from "@/lib/v1";
import { withV1Key } from "@/lib/v1-auth";
import { v1Ok } from "@repo/api-schemas/envelope";
import { v1NoteCreateRequest } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { note } from "@repo/database/schema";

/**
 * POST /api/v1/notes/create — 201 with the created note. Personal keys create
 * private notes; workspace keys must target a team space via space_id.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = v1NoteCreateRequest.safeParse(body);

  return withV1Key(
    request,
    { personal: "notes:write", workspace: "workspace:notes:write" },
    async (auth) => {
      if (!parsed.success) return validationError("Invalid note payload");
      const input = parsed.data;

      let organizationId: string | null = null;
      let spaceId: string | null = null;
      if (auth.kind === "personal") {
        if (input.space_id) {
          return validationError("space_id is not allowed for personal keys");
        }
      } else {
        if (!input.space_id) {
          return validationError("space_id is required for workspace keys");
        }
        const spaceRow = await resolveWorkspaceSpace(auth, input.space_id);
        if (!spaceRow) return notFoundError("Space not found");
        organizationId = auth.organizationId;
        spaceId = input.space_id;
      }

      const [row] = await db()
        .insert(note)
        .values({
          id: crypto.randomUUID(),
          userId: auth.userId,
          organizationId,
          spaceId,
          title: input.title ?? null,
          content: input.content,
          enhancedContent: input.enhanced_content ?? null,
          noteType: input.note_type ?? "personal",
          folderId: input.folder_id ?? null,
          createdByUserId: auth.userId,
          updatedByUserId: auth.userId,
        })
        .returning();

      return v1Ok(toV1Note(row), 201);
    },
  );
}
