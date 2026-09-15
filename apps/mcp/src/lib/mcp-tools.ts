import { and, desc, eq, gt, isNull, or } from "@repo/database";
import { db } from "@repo/database";
import { note, usagePeriod } from "@repo/database/schema";
import { ilike } from "drizzle-orm";
import type { McpKeyContext, McpScope } from "./mcp-auth";
import { hasScope } from "./mcp-auth";

/**
 * Notes MCP tools. Handlers query the DB directly, scoped by the API key:
 * personal keys act on the key owner's notes, workspace keys on the key's
 * organization (space_id required for notes_list).
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  scope: McpScope;
  handler: (
    ctx: McpKeyContext,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
}

export class ToolScopeError extends Error {}

function argString(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function argNumber(
  args: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function requireScope(ctx: McpKeyContext, scope: McpScope): void {
  if (!hasScope(ctx, scope)) {
    throw new ToolScopeError(`Key is missing the required scope: ${scope}`);
  }
}

/** Row filter enforcing key identity. Workspace keys can pin a space. */
function noteFilter(ctx: McpKeyContext, spaceId?: string) {
  if (ctx.kind === "workspace") {
    const filters = [
      eq(note.organizationId, ctx.organizationId ?? ""),
      isNull(note.deletedAt),
    ];
    if (spaceId) filters.push(eq(note.spaceId, spaceId));
    return and(...filters);
  }
  return and(eq(note.userId, ctx.userId), isNull(note.deletedAt));
}

function toNoteDto(row: typeof note.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    enhanced_content: row.enhancedContent,
    note_type: row.noteType,
    folder_id: row.folderId,
    workspace_id: row.organizationId,
    space_id: row.spaceId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function decodeCursor(cursor: string): number {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const offset = Number.parseInt(decoded, 10);
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: "notes_list",
    description:
      "List the caller's notes, newest first. Supports pagination via cursor, and filtering by folder or space. Workspace keys must pass space_id.",
    scope: "notes:read",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max notes to return (1-100, default 20).",
        },
        cursor: {
          type: "string",
          description: "Opaque pagination cursor from a previous page.",
        },
        folder_id: { type: "string", description: "Filter by folder id." },
        space_id: {
          type: "string",
          description: "Filter by space id (required for workspace keys).",
        },
      },
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      requireScope(ctx, "notes:read");
      const spaceId = argString(args, "space_id");
      if (ctx.kind === "workspace" && !spaceId) {
        throw new ToolScopeError("workspace keys must pass space_id");
      }
      const limit = Math.min(Math.max(argNumber(args, "limit") ?? 20, 1), 100);
      const offset = decodeCursor(argString(args, "cursor") ?? "");
      const filters = [noteFilter(ctx, spaceId)];
      const folderId = argString(args, "folder_id");
      if (folderId) filters.push(eq(note.folderId, folderId));

      const rows = await db()
        .select()
        .from(note)
        .where(and(...filters))
        .orderBy(desc(note.updatedAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        notes: page.map(toNoteDto),
        next_cursor: hasMore ? encodeCursor(offset + limit) : null,
      };
    },
  },
  {
    name: "notes_get",
    description: "Get a single note by id, including its full content.",
    scope: "notes:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note id." },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      requireScope(ctx, "notes:read");
      const id = argString(args, "id");
      if (!id) throw new ToolScopeError("id is required");
      const [row] = await db()
        .select()
        .from(note)
        .where(and(eq(note.id, id), noteFilter(ctx)))
        .limit(1);
      if (!row) return { error: "Note not found" };
      return { note: toNoteDto(row) };
    },
  },
  {
    name: "notes_search",
    description:
      "Full-text search over note titles and content (case-insensitive substring match).",
    scope: "notes:read",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text." },
        limit: {
          type: "number",
          description: "Max results (1-100, default 20).",
        },
        space_id: { type: "string", description: "Filter by space id." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      requireScope(ctx, "notes:read");
      const query = argString(args, "query");
      if (!query) throw new ToolScopeError("query is required");
      const limit = Math.min(Math.max(argNumber(args, "limit") ?? 20, 1), 100);
      const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;
      const rows = await db()
        .select()
        .from(note)
        .where(
          and(
            noteFilter(ctx, argString(args, "space_id")),
            or(ilike(note.title, pattern), ilike(note.content, pattern)),
          ),
        )
        .orderBy(desc(note.updatedAt))
        .limit(limit);
      return { results: rows.map(toNoteDto) };
    },
  },
  {
    name: "notes_create",
    description:
      "Create a new note from the given content. Workspace keys create inside their organization.",
    scope: "notes:write",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Note body text." },
        title: { type: "string", description: "Optional note title." },
        folder_id: { type: "string", description: "Optional folder id." },
        space_id: { type: "string", description: "Optional space id." },
      },
      required: ["content"],
      additionalProperties: false,
    },
    handler: async (ctx, args) => {
      requireScope(ctx, "notes:write");
      const content = argString(args, "content");
      if (!content) throw new ToolScopeError("content is required");
      const [row] = await db()
        .insert(note)
        .values({
          id: crypto.randomUUID(),
          userId: ctx.userId,
          organizationId: ctx.kind === "workspace" ? ctx.organizationId : null,
          spaceId: argString(args, "space_id") ?? null,
          folderId: argString(args, "folder_id") ?? null,
          title: argString(args, "title") ?? null,
          content,
          createdByUserId: ctx.userId,
        })
        .returning();
      return { note: toNoteDto(row) };
    },
  },
  {
    name: "usage_get",
    description:
      "Get the caller's current word-usage period: words used, limit, plan, and reset date.",
    scope: "usage:read",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async (ctx) => {
      requireScope(ctx, "usage:read");
      const isWorkspace = ctx.kind === "workspace";
      const [row] = await db()
        .select()
        .from(usagePeriod)
        .where(
          and(
            isWorkspace
              ? eq(usagePeriod.organizationId, ctx.organizationId ?? "")
              : eq(usagePeriod.userId, ctx.userId),
            gt(usagePeriod.periodEnd, new Date()),
          ),
        )
        .orderBy(desc(usagePeriod.periodEnd))
        .limit(1);
      if (!row) {
        return {
          plan: "free",
          words_used: 0,
          word_limit: 20_000,
          period_start: null,
          period_end: null,
          reset_at: null,
        };
      }
      return {
        plan: row.plan,
        words_used: row.wordsUsed,
        word_limit: row.wordLimit,
        period_start: row.periodStart.toISOString(),
        period_end: row.periodEnd.toISOString(),
        reset_at: row.resetAt?.toISOString() ?? null,
      };
    },
  },
];

/** Tools this key may actually call, for tools/list. */
export function visibleTools(ctx: McpKeyContext): McpTool[] {
  return MCP_TOOLS.filter((tool) => hasScope(ctx, tool.scope));
}

export function findTool(name: string): McpTool | undefined {
  return MCP_TOOLS.find((tool) => tool.name === name);
}
