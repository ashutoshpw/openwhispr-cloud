# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src`, with the App Router under `src/app`, shared UI in `src/components`, helpers in `src/lib`, and types/utilities in `src/types` and `src/utils`. Design tokens and Tailwind layers reside in `src/app/globals.css`. Database schema definitions are in `drizzle/` with the companion config at `drizzle.config.ts`. Published assets live in `public/`, while MDX content and docs sit in `content/` and `docs/`. Keep new feature folders self-contained inside `src/app/(feature)` and share cross-cutting logic through `src/lib`.

## Build, Test, and Development Commands
- `npm run dev` – Next.js 16 dev server with hot reload.
- `npm run build` – Production bundle (fails on type or lint errors).
- `npm run start` – Serve the built app locally.
- `npm run lint` / `npm run lint:fix` – Biome static analysis (auto-fix with `lint:fix`).
- `npm run format` – Apply Biome formatting; pair with `format:check` in CI.
- `npm run db:generate`, `db:migrate`, `db:push`, `db:studio` – Manage Drizzle migrations and schema pushes; always regenerate after editing files in `drizzle/`.

## Coding Style & Naming Conventions
TypeScript is required across the repo. Use two-space indentation, single quotes in TS/TSX, and keep files UTF-8 ASCII-friendly. Components and hooks follow `PascalCase` (`DashboardShell`) and `camelCase` (`useBillingPortal`). API routes use kebab-case folders (e.g., `src/app/api/billing/route.ts`). Favor server components unless client hooks or browser APIs demand `"use client"`. Run `npm run lint` before pushing; Biome (configured in `biome.json`) enforces both lint and format rules.

## Testing Guidelines
There is no formal automated test harness yet—document manual verification steps in each PR. When adding tests, colocate them with their modules (`feature.test.tsx`) or under `src/tests`. Prefer Vitest + Testing Library for unit coverage and Playwright for flow tests so they can run inside CI without extra services. Keep test names declarative (`it('renders empty state when no invoices')`). Always run `npm run build` to ensure the app compiles before merging.

## Commit & Pull Request Guidelines
Git history currently uses short imperative descriptions (`next auth working`, `clerk provider working`). Keep following that style: one feature or fix per commit, 72-character subject, and optional body for context. PRs should include: concise summary, screenshots for UI changes, database migration notes if `drizzle/` changed, manual test steps, and linked issues. Ensure PRs pass `npm run lint` and any added tests, and note required environment variables when a feature depends on new secrets.

## Security & Configuration Notes
Secrets belong in `.env.local` and never in Git; redact example values before attaching logs. Rotate `NEXT_PUBLIC_AUTH_PROVIDER` and related keys when switching between BetterAuth and NextAuth. Database migrations should be reviewed because `db:push` can overwrite dev data—prefer `db:migrate` for anything shared. When exposing MCP or webhook endpoints, confirm URLs through `baseUrl.js` to avoid leaking staging hosts.
