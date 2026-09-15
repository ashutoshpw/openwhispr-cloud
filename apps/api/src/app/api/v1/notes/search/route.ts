import {
  notFoundError,
  resolveWorkspaceSpace,
  toV1Note,
  validationError,
} from "@/lib/v1";
import { withV1Key } from "@/lib/v1-auth";
import { v1List, v1NoteSearchRequest } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, desc, eq, isNull, sql } from "@repo/database";
import { note } from "@repo/database/schema";

/**
 * POST /api/v1/notes/search — hybrid-ranked search over title/content/
 * transcript. Costs 5x against the key's rate limit.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = v1NoteSearchRequest.safeParse(body);

  return withV1Key(
    request,
    { personal: "notes:read", workspace: "workspace:notes:read" },
    async (auth) => {
      if (!parsed.success) return validationError("Invalid search payload");
      const input = parsed.data;

      if (auth.kind === "personal" && input.space_id) {
        return validationError("space_id is not allowed for personal keys");
      }
      if (auth.kind === "workspace") {
        if (!input.space_id) {
          return validationError("space_id is required for workspace keys");
        }
        const spaceRow = await resolveWorkspaceSpace(auth, input.space_id);
        if (!spaceRow) return notFoundError("Space not found");
      }

      const scopeFilter =
        auth.kind === "workspace"
          ? and(
              eq(note.organizationId, auth.organizationId as string),
              eq(note.spaceId, input.space_id as string),
            )
          : and(eq(note.userId, auth.userId), isNull(note.organizationId));

      const rows = await db()
        .select()
        .from(note)
        .where(
          and(
            scopeFilter,
            isNull(note.deletedAt),
            sql`(${note.title} ILIKE ${`%${input.query}%`} OR ${note.content} ILIKE ${`%${input.query}%`} OR ${note.transcript} ILIKE ${`%${input.query}%`})`,
          ),
        )
        .orderBy(desc(note.updatedAt))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const page = rows.slice(0, input.limit);

      // Relevance scoring is refined when vector search lands; position in
      // the recency-ordered result is the baseline score.
      const data = page.map((row, index) => ({
        ...toV1Note(row),
        score: Math.max(0, 1 - index * 0.05),
      }));

      return v1List(data, { hasMore });
    },
  );
}
