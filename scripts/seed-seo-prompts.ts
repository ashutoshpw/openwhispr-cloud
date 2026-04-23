/**
 * Auto-derive AIEO prompts from existing seo_keywords. Each active keyword
 * is rephrased into 1-2 question forms and inserted into seo_prompts.
 * Idempotent — ON CONFLICT (prompt) DO NOTHING.
 *
 * Run: bun run scripts/seed-seo-prompts.ts [--dry-run]
 */

import { db, sql } from "@repo/database";

const isDryRun = process.argv.includes("--dry-run");

interface KeywordRow extends Record<string, unknown> {
  id: string;
  keyword: string;
  cluster: string | null;
  intent: string | null;
  priority: string | null;
  target_path: string | null;
}

function questionForms(keyword: string, intent: string | null): string[] {
  const k = keyword.trim();
  const forms = new Set<string>();
  const isHowTo = intent === "informational" || /\bhow\b/i.test(k);
  const isComparison = /\bvs\b|\balternative\b|\bvs\.?\b/i.test(k);
  const isBest = /\bbest\b|\btop\b/i.test(k);

  if (isComparison) {
    forms.add(`What is the best ${k.replace(/\bvs\.?\b/gi, "or")}?`);
    forms.add(`How does ${k} compare?`);
  } else if (isBest) {
    forms.add(`What is the ${k}?`);
    forms.add(`Recommend ${k} for a SaaS team`);
  } else if (isHowTo) {
    forms.add(`How do I ${k.replace(/^how (to|do i) /i, "")}?`);
    forms.add(
      `What is the easiest way to ${k.replace(/^how (to|do i) /i, "")}?`,
    );
  } else {
    forms.add(`What is ${k}?`);
    forms.add(`Recommend a tool for ${k}`);
  }
  return Array.from(forms);
}

function unwrap(r: unknown): Record<string, unknown>[] {
  if (Array.isArray(r)) return r as Record<string, unknown>[];
  return ((r as { rows?: unknown[] })?.rows ?? []) as Record<string, unknown>[];
}

async function main() {
  const res = await db().execute(sql`
    SELECT id, keyword, cluster, intent, priority, target_path
    FROM seo_keywords
    WHERE is_active = true
    ORDER BY priority NULLS LAST, keyword
  `);
  const keywords = unwrap(res) as KeywordRow[];
  console.log(
    `Found ${keywords.length} active keywords${isDryRun ? " (dry-run)" : ""}`,
  );

  let inserted = 0;
  for (const k of keywords) {
    const prompts = questionForms(k.keyword, k.intent);
    for (const p of prompts) {
      if (isDryRun) {
        console.log(`  ${k.keyword}  →  ${p}`);
        continue;
      }
      const r = (await db().execute(sql`
        INSERT INTO seo_prompts (prompt, intent, cluster, priority, linked_keyword_id, target_path)
        VALUES (${p}, ${k.intent}, ${k.cluster}, ${k.priority ?? "medium"}, ${k.id}, ${k.target_path})
        ON CONFLICT (prompt) DO NOTHING
      `)) as { rowCount?: number };
      if (r.rowCount && r.rowCount > 0) inserted++;
    }
  }
  console.log(`Inserted ${inserted} new prompts (existing prompts preserved).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
