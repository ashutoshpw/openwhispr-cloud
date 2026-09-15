import {
  decodeNoteCursor,
  encodeNoteCursor,
  notFoundError,
  resolveWorkspaceSpace,
  toV1Note,
  validationError,
} from "@/lib/v1";
import { withV1Key } from "@/lib/v1-auth";
import { v1List, v1NoteListQuery } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, desc, eq, isNull, lt, or } from "@repo/database";
import { note } from "@repo/database/schema";

/**
 * GET /api/v1/notes/list — cursor pagination over an updated_at:id composite.
 * Personal keys list the user's private notes; workspace keys must pass a
 * space_id and see that team space's notes.
 */
export async function GET(request: Request) {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = v1NoteListQuery.safeParse(query);

  return withV1Key(
    request,
    { personal: "notes:read", workspace: "workspace:notes:read" },
    async (auth) => {
      if (!parsed.success) return validationError("Invalid query parameters");
      const q = parsed.data;

      if (auth.kind === "personal") {
        if (q.space_id) {
          return validationError("space_id is not allowed for personal keys");
        }
      } else {
        if (!q.space_id) {
          return validationError("space_id is required for workspace keys");
        }
        const spaceRow = await resolveWorkspaceSpace(auth, q.space_id);
        if (!spaceRow) return notFoundError("Space not found");
      }

      let cursor: { updatedAt: Date; id: string } | null = null;
      if (q.cursor) {
        cursor = decodeNoteCursor(q.cursor);
        if (!cursor) return validationError("Invalid cursor");
      }

      const scopeFilter =
        auth.kind === "workspace"
          ? and(
              eq(note.organizationId, auth.organizationId as string),
              eq(note.spaceId, q.space_id as string),
            )
          : and(eq(note.userId, auth.userId), isNull(note.organizationId));

      const rows = await db()
        .select()
        .from(note)
        .where(
          and(
            scopeFilter,
            isNull(note.deletedAt),
            q.folder_id ? eq(note.folderId, q.folder_id) : undefined,
            cursor
              ? or(
                  lt(note.updatedAt, cursor.updatedAt),
                  and(
                    eq(note.updatedAt, cursor.updatedAt),
                    lt(note.id, cursor.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(note.updatedAt), desc(note.id))
        .limit(q.limit + 1);

      const hasMore = rows.length > q.limit;
      const page = rows.slice(0, q.limit);

      return v1List(page.map(toV1Note), {
        hasMore,
        nextCursor: hasMore ? encodeNoteCursor(page[page.length - 1]) : null,
      });
    },
  );
}
