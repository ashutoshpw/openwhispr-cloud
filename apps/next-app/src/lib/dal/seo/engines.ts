import { asc, db, eq, seoEngines, sql } from "@repo/database";

export interface SeoEngineRow {
  id: string;
  label: string;
  vendor: string;
  modelId: string | null;
  isActive: boolean;
  defaultCostCents: number;
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export async function listEngines(
  opts: { activeOnly?: boolean } = {},
): Promise<SeoEngineRow[]> {
  const where = opts.activeOnly ? eq(seoEngines.isActive, true) : undefined;
  const rows = await db()
    .select()
    .from(seoEngines)
    .where(where)
    .orderBy(asc(seoEngines.id));
  return rows as SeoEngineRow[];
}

export async function getEngine(id: string): Promise<SeoEngineRow | null> {
  const rows = await db()
    .select()
    .from(seoEngines)
    .where(eq(seoEngines.id, id))
    .limit(1);
  return (rows[0] as SeoEngineRow | undefined) ?? null;
}

export async function setEngineActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await db()
    .update(seoEngines)
    .set({
      isActive,
      updatedAt: sql`EXTRACT(epoch FROM now())::bigint` as unknown as number,
    })
    .where(eq(seoEngines.id, id));
}

export async function setEngineModelId(
  id: string,
  modelId: string | null,
): Promise<void> {
  await db()
    .update(seoEngines)
    .set({
      modelId,
      updatedAt: sql`EXTRACT(epoch FROM now())::bigint` as unknown as number,
    })
    .where(eq(seoEngines.id, id));
}
