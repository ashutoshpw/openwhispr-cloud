import { and, db, desc, eq, gte, seoAioPresence, sql } from "@repo/database";

export interface SeoAioPresenceRow {
  id: string;
  keywordId: string;
  capturedAt: number;
  hasAio: boolean;
  ourCited: boolean;
  ourCitationUrl: string | null;
  competitors: Array<{ url: string; domain: string; title?: string }>;
  source: string;
}

export interface InsertAioPresenceInput {
  keywordId: string;
  capturedAt?: number;
  hasAio: boolean;
  ourCited: boolean;
  ourCitationUrl: string | null;
  competitors: Array<{ url: string; domain: string; title?: string }>;
  source?: string;
}

export async function insertAioPresence(
  input: InsertAioPresenceInput,
): Promise<SeoAioPresenceRow> {
  const [row] = await db()
    .insert(seoAioPresence)
    .values({
      keywordId: input.keywordId,
      capturedAt: input.capturedAt ?? Math.floor(Date.now() / 1000),
      hasAio: input.hasAio,
      ourCited: input.ourCited,
      ourCitationUrl: input.ourCitationUrl,
      competitors: input.competitors,
      source: input.source ?? "dataforseo",
    })
    .returning();
  return row as SeoAioPresenceRow;
}

export async function hasAioPresenceOnDate(
  keywordId: string,
  capturedAt: number,
): Promise<boolean> {
  const dayStart = Math.floor(capturedAt / 86400) * 86400;
  const dayEnd = dayStart + 86400;
  const rows = await db()
    .select({ id: seoAioPresence.id })
    .from(seoAioPresence)
    .where(
      and(
        eq(seoAioPresence.keywordId, keywordId),
        gte(seoAioPresence.capturedAt, dayStart),
        sql`${seoAioPresence.capturedAt} < ${dayEnd}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listAioPresenceForKeyword(
  keywordId: string,
  opts: { limit?: number } = {},
): Promise<SeoAioPresenceRow[]> {
  return db()
    .select()
    .from(seoAioPresence)
    .where(eq(seoAioPresence.keywordId, keywordId))
    .orderBy(desc(seoAioPresence.capturedAt))
    .limit(opts.limit ?? 100) as Promise<SeoAioPresenceRow[]>;
}
