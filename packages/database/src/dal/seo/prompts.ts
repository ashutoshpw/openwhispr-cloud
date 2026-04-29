import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../../client";
import { seoPromptSnapshots, seoPrompts } from "../../schema-seo";

export interface SeoPromptRow {
  id: string;
  prompt: string;
  intent: string | null;
  cluster: string | null;
  priority: string;
  isActive: boolean;
  linkedKeywordId: string | null;
  targetPath: string | null;
  createdAt: number;
  updatedAt: number;
}

export async function listPrompts(
  opts: { activeOnly?: boolean } = {},
): Promise<SeoPromptRow[]> {
  const where = opts.activeOnly ? eq(seoPrompts.isActive, true) : undefined;
  return db()
    .select()
    .from(seoPrompts)
    .where(where)
    .orderBy(asc(seoPrompts.priority), asc(seoPrompts.prompt)) as Promise<
    SeoPromptRow[]
  >;
}

export async function getPromptById(id: string): Promise<SeoPromptRow | null> {
  const rows = await db()
    .select()
    .from(seoPrompts)
    .where(eq(seoPrompts.id, id))
    .limit(1);
  return (rows[0] as SeoPromptRow | undefined) ?? null;
}

export interface CreatePromptInput {
  prompt: string;
  intent?: string | null;
  cluster?: string | null;
  priority?: string;
  linkedKeywordId?: string | null;
  targetPath?: string | null;
}

export async function createPrompt(
  input: CreatePromptInput,
): Promise<SeoPromptRow> {
  const [row] = await db()
    .insert(seoPrompts)
    .values({
      prompt: input.prompt,
      intent: input.intent ?? null,
      cluster: input.cluster ?? null,
      priority: input.priority ?? "medium",
      linkedKeywordId: input.linkedKeywordId ?? null,
      targetPath: input.targetPath ?? null,
    })
    .returning();
  return row as SeoPromptRow;
}

export async function updatePrompt(
  id: string,
  patch: Partial<CreatePromptInput> & { isActive?: boolean },
): Promise<SeoPromptRow | null> {
  const [row] = await db()
    .update(seoPrompts)
    .set({
      ...patch,
      updatedAt: sql`EXTRACT(epoch FROM now())::bigint` as unknown as number,
    })
    .where(eq(seoPrompts.id, id))
    .returning();
  return (row as SeoPromptRow) ?? null;
}

export async function archivePrompt(id: string): Promise<void> {
  await db()
    .update(seoPrompts)
    .set({
      isActive: false,
      updatedAt: sql`EXTRACT(epoch FROM now())::bigint` as unknown as number,
    })
    .where(eq(seoPrompts.id, id));
}

export async function findPromptsWithStaleSnapshots(
  staleAfterSeconds: number,
): Promise<Array<SeoPromptRow & { lastCapturedAt: number | null }>> {
  const threshold = Math.floor(Date.now() / 1000) - staleAfterSeconds;

  const latestSql = sql<number | null>`(
    SELECT MAX(s.captured_at)
    FROM ${seoPromptSnapshots} s
    WHERE s.prompt_id = ${seoPrompts.id}
  )`;

  const rows = await db()
    .select({
      id: seoPrompts.id,
      prompt: seoPrompts.prompt,
      intent: seoPrompts.intent,
      cluster: seoPrompts.cluster,
      priority: seoPrompts.priority,
      isActive: seoPrompts.isActive,
      linkedKeywordId: seoPrompts.linkedKeywordId,
      targetPath: seoPrompts.targetPath,
      createdAt: seoPrompts.createdAt,
      updatedAt: seoPrompts.updatedAt,
      lastCapturedAt: latestSql,
    })
    .from(seoPrompts)
    .where(
      and(
        eq(seoPrompts.isActive, true),
        or(isNull(latestSql), sql`${latestSql} < ${threshold}`),
      ),
    )
    .orderBy(asc(seoPrompts.prompt));

  return rows as Array<SeoPromptRow & { lastCapturedAt: number | null }>;
}
