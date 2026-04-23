import { asc, db, eq, seoPages, sql } from "@repo/database";

export interface SeoPageRow {
  id: string;
  path: string;
  title: string;
  type: string;
  cluster: string | null;
  status: string;
  primaryKeywordId: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export async function listPages(
  opts: { status?: string } = {},
): Promise<SeoPageRow[]> {
  const where = opts.status ? eq(seoPages.status, opts.status) : undefined;
  return db()
    .select()
    .from(seoPages)
    .where(where)
    .orderBy(asc(seoPages.status), asc(seoPages.title)) as Promise<
    SeoPageRow[]
  >;
}

export async function getPageByPath(path: string): Promise<SeoPageRow | null> {
  const rows = await db()
    .select()
    .from(seoPages)
    .where(eq(seoPages.path, path))
    .limit(1);
  return (rows[0] as SeoPageRow) ?? null;
}

export interface PageStatusCounts {
  idea: number;
  outlined: number;
  drafted: number;
  in_review: number;
  published: number;
  total: number;
}

export async function countPagesByStatus(): Promise<PageStatusCounts> {
  const rows = await db()
    .select({
      status: seoPages.status,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(seoPages)
    .groupBy(seoPages.status);

  const out: PageStatusCounts = {
    idea: 0,
    outlined: 0,
    drafted: 0,
    in_review: 0,
    published: 0,
    total: 0,
  };
  for (const r of rows) {
    const k = r.status as keyof PageStatusCounts;
    if (k in out) out[k] = Number(r.count);
    out.total += Number(r.count);
  }
  return out;
}
