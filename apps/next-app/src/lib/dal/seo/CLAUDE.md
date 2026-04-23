# SEO + AIEO modules

Ported from appreviewbot/arb-dev (commit e35f6939). See
`/adminx/seo/*` for the admin UI.

## Tables (`packages/database/src/schema-seo.ts`)

SEO: `seo_keywords`, `seo_keyword_snapshots`, `seo_gsc_daily`,
`seo_pages`, `seo_annotations`.

AIEO: `seo_engines`, `seo_prompts`, `seo_prompt_snapshots`,
`seo_aio_presence`, `seo_competitors`, `seo_referrer_ai`,
`seo_ai_bot_hits`, `seo_secrets`, `seo_settings`.

Run `bun run db:push` to apply. (Generate first may hit interactive
rename prompts if unrelated stale tables exist in the DB — answer
"+ create" to each seo_* entry.)

## Inngest crons (registered in `/api/inngest/route.ts`)

| Cron | Schedule | Purpose |
|---|---|---|
| `seo-rank-snapshot` | Mon 04:00 UTC | DataForSEO live SERP per keyword |
| `seo-gsc-sync` | daily 04:00 UTC | Google Search Console 3-day upsert |
| `seo-prompt-snapshot` | Mon 05:00 UTC | AIEO prompt × engine matrix |
| `seo-aio-snapshot` | Mon 04:30 UTC | Google AI Overview per keyword |
| `seo-secret-validation` | daily 00:00 UTC | Ping each vendor, record status |
| `seo-competitor-rollup` | Mon 06:00 UTC | Rebuild seo_competitors from citations |
| `seo-posthog-referrer-rollup` | daily 03:30 UTC | Sessions+signups per AI host |

Budget guard: `seo-prompt-snapshot` aborts when
`seo_settings.weeklyBudgetUsd` cap would be exceeded; emits
`cron/seo-aieo-budget-exceeded`.

## Access control

All routes + server actions call `ensureSeoAccess(mode)` from
`src/lib/seo-guard.ts`. Backed by BetterAuth site-admin role.

## Secrets

AES-256-GCM encrypted at rest via `AIEO_ENCRYPTION_KEY` (32-byte hex).
`getSecret(key)` falls back to `process.env[key]` if no row exists —
migrate via `/adminx/seo/aieo/secrets`.

## Seeds

```bash
bun run db:push                    # create tables first
bun run seed:seo:engines           # 5 engines (disabled by default)
bun run seed:seo:settings          # defaults (weeklyBudgetUsd=5, etc.)
bun run seed:seo:prompts           # auto-derive from seo_keywords
```

Engines start disabled. Enable at `/adminx/seo/aieo/engines` and add
keys at `/adminx/seo/aieo/secrets` before the cron can run.

## GEO surface (apps/next-app)

- `/llms.txt` + `/llms-full.txt` — crawler index
- `/robots.txt` — explicit allow for 10 AI crawlers, disallow for
  admin/dashboard/api/auth
- `proxy.ts` — detects 14 AI bot UAs and fires a bot-hit ingest
- `components/blog/GeoComponents.tsx` — `<TLDR>`, `<Sources>`,
  `<JsonLd>` MDX components (wire into blog MDX map as needed)

## Required env vars

See root `.env.example` — `SEO_TARGET_DOMAIN`, `DATAFORSEO_AUTH`,
`GSC_SERVICE_ACCOUNT_JSON`, `GSC_PROPERTY`, `INNGEST_*`,
`AIEO_ENCRYPTION_KEY`, `CRON_SECRET`, and per-provider fallback keys.
