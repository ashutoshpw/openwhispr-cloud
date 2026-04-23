/**
 * Competitor inference. Walks the last N days of seo_prompt_snapshots, extracts
 * every cited domain, strips noise + our target domain, and increments
 * mention counts in seo_competitors. Feeds back into engine adapters via
 * listTopCompetitorDomains().
 */

import { upsertCompetitor } from "@/lib/dal/seo/competitors";
import { db, sql } from "@repo/database";
import { normalizeDomain } from "./parse";
import { getSetting } from "./settings/store";

interface InferenceResult {
  domainsScanned: number;
  noiseFiltered: number;
  upserted: number;
}

function unwrap(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const inner = (result as { rows?: unknown[] })?.rows ?? [];
  return inner as Record<string, unknown>[];
}

export async function inferCompetitorsFromRecentSnapshots(
  opts: { sinceDays?: number } = {},
): Promise<InferenceResult> {
  const sinceDays = opts.sinceDays ?? 30;
  const since = Math.floor(Date.now() / 1000) - sinceDays * 86400;

  const targetDomain = normalizeDomain(
    (await getSetting<string>("targetDomain")) || "example.com",
  );
  const noise = ((await getSetting<string[]>("noiseDomains")) ?? []).map(
    normalizeDomain,
  );
  const noiseSet = new Set(noise);

  const res = await db().execute(sql`
    SELECT citations
    FROM seo_prompt_snapshots
    WHERE captured_at >= ${since}
      AND citations IS NOT NULL
      AND jsonb_typeof(citations) = 'array'
      AND jsonb_array_length(citations) > 0
  `);

  const counts = new Map<string, number>();
  let scanned = 0;
  let filtered = 0;
  for (const row of unwrap(res)) {
    const citations = (row.citations as Array<{ domain?: string }>) ?? [];
    for (const c of citations) {
      const d = c?.domain ? normalizeDomain(c.domain) : "";
      if (!d) continue;
      scanned++;
      if (d === targetDomain || d.endsWith(`.${targetDomain}`)) {
        filtered++;
        continue;
      }
      if (
        noiseSet.has(d) ||
        Array.from(noiseSet).some((n) => d.endsWith(`.${n}`))
      ) {
        filtered++;
        continue;
      }
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }

  let upserted = 0;
  for (const [domain, count] of Array.from(counts)) {
    await upsertCompetitor(domain, count);
    upserted++;
  }

  return { domainsScanned: scanned, noiseFiltered: filtered, upserted };
}
