/**
 * Seed seo_engines registry with the 5 supported AIEO engines.
 * Idempotent — uses ON CONFLICT (id).
 *
 * Run: bun run scripts/seed-seo-engines.ts
 */

import { db, sql } from "@repo/database";

interface EngineSeed {
  id: string;
  label: string;
  vendor: string;
  modelId: string | null;
  defaultCostCents: number;
  config: Record<string, unknown>;
}

const engines: EngineSeed[] = [
  {
    id: "perplexity",
    label: "Perplexity",
    vendor: "perplexity",
    modelId: "sonar-pro",
    defaultCostCents: 1,
    config: { baseUrl: "https://api.perplexity.ai" },
  },
  {
    id: "google_aio",
    label: "Google AI Overview",
    vendor: "dataforseo",
    modelId: null,
    defaultCostCents: 1,
    config: { country: "US", language: "en" },
  },
  {
    id: "openai",
    label: "OpenAI ChatGPT",
    vendor: "openai",
    modelId: "gpt-5.4-mini",
    defaultCostCents: 2,
    config: { useWebSearch: true },
  },
  {
    id: "gemini",
    label: "Google Gemini",
    vendor: "google",
    modelId: "gemini-2.5-pro",
    defaultCostCents: 1,
    config: { useGrounding: true },
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    vendor: "anthropic",
    modelId: "claude-sonnet-4-5",
    defaultCostCents: 2,
    config: { useWebSearch: true },
  },
];

async function main() {
  console.log(`Seeding ${engines.length} AIEO engines...`);
  for (const e of engines) {
    await db().execute(sql`
      INSERT INTO seo_engines (id, label, vendor, model_id, is_active, default_cost_cents, config)
      VALUES (${e.id}, ${e.label}, ${e.vendor}, ${e.modelId}, false, ${e.defaultCostCents}, ${JSON.stringify(e.config)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        vendor = EXCLUDED.vendor,
        model_id = COALESCE(seo_engines.model_id, EXCLUDED.model_id),
        default_cost_cents = EXCLUDED.default_cost_cents,
        updated_at = EXTRACT(epoch FROM now())::bigint
    `);
    console.log(`  ✓ ${e.id}`);
  }
  console.log(
    "Done. Engines start disabled — enable + add API keys via /adminx/seo/aieo/secrets and /adminx/seo/aieo/engines.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
