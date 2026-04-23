/**
 * Seed seo_settings with sane defaults for the AIEO subsystem.
 * Idempotent — only INSERTs when key not already present, so user-edited
 * values are preserved across re-runs.
 *
 * Run: bun run scripts/seed-seo-settings.ts
 */

import { db, sql } from "@repo/database";

const defaults: Record<string, unknown> = {
  weeklyBudgetUsd: 5,
  sentimentModel: "gpt-5.4-mini",
  targetDomain: "example.com",
  noiseDomains: [
    "wikipedia.org",
    "github.com",
    "reddit.com",
    "youtube.com",
    "medium.com",
    "quora.com",
    "stackoverflow.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "facebook.com",
  ],
  posthogProjectId: "",
  posthogHost: "https://us.i.posthog.com",
};

async function main() {
  let inserted = 0;
  for (const [key, value] of Object.entries(defaults)) {
    const res = (await db().execute(sql`
      INSERT INTO seo_settings (key, value, updated_by)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, 'seed')
      ON CONFLICT (key) DO NOTHING
    `)) as { rowCount?: number };
    if (res.rowCount && res.rowCount > 0) inserted++;
  }
  console.log(`Inserted ${inserted} new settings (existing values preserved).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
