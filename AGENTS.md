# Repository Guidelines

## Monorepo Structure

This is a Turborepo monorepo using bun workspaces with TUI mode enabled.

```
.
├── apps/
│   └── next-app/           # Next.js 16 application
│       ├── src/
│       │   ├── app/        # App Router pages and layouts
│       │   ├── components/ # Shared UI components
│       │   ├── lib/        # Helpers and business logic
│       │   ├── types/      # TypeScript type definitions
│       │   └── utils/      # Utility functions
│       ├── public/         # Static assets
│       └── content/        # Blog MDX content
├── docs-public/            # Public, task-oriented Mintlify documentation
├── docs-internal/          # Private developer and agent Mintlify documentation
├── packages/
│   └── database/           # Shared Drizzle database package (@repo/database)
│       ├── src/
│       │   ├── schema.ts   # Drizzle schema definitions
│       │   ├── client.ts   # Database connection (getDb)
│       │   └── index.ts    # Re-exports
│       └── drizzle.config.ts
├── scripts/                # Root-level scripts (setup, seed, stripe)
├── turbo.json              # Turborepo config with TUI mode
└── package.json            # Root workspace config
```

## Build, Test, and Development Commands

All commands use bun and are run from the monorepo root:

- `bun install` - Install all dependencies across workspaces
- `bun run dev` - Start Next.js dev server with Turbo TUI
- `bun run build` - Production build (fails on type or lint errors)
- `bun run start` - Serve the built app locally
- `bun run lint` / `bun run lint:fix` - Biome static analysis
- `bun run format` / `bun run format:check` - Biome formatting

### Database Commands

- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Run migrations
- `bun run db:push` - Push schema to database (dev only)
- `bun run db:studio` - Open Drizzle Studio
- `bun run db:seed` - Seed admin user

### Workspace Filtering

Run commands for specific packages:

```bash
bun run --filter @repo/next-app dev     # Run dev for Next.js app only
bun run --filter @repo/database build   # Build database package only
```

## Documentation Policy

- Put public documentation in `docs-public/`. Organize it around the visitor's problem and use the Mintlify tabs instead of feature-tour pages.
- Put developer and agent documentation in `docs-internal/`.
- Do not add `docs/` or nested `*/docs/*` directories. The pre-commit hook checks staged paths and ignores `.agents/**` and `.claude/**`.
- These root files are exempt: `README.md`, `LICENCE.md`, `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md`.
- Preview with `bun run docs:public` or `bun run docs:internal`; validate with the corresponding `:validate` command.

## Package Dependencies

### Importing from @repo/database

The database package exports schema and client:

```typescript
// Import database client
import { db } from "@repo/database";

// Import schema tables
import { user, session, organization } from "@repo/database/schema";
```

Path aliases in `apps/next-app/tsconfig.json`:
- `@/*` - Maps to `./src/*` for app-internal imports
- `@repo/database` - Maps to the database package

## Coding Style & Naming Conventions

TypeScript is required across the repo. Use two-space indentation, single quotes in TS/TSX, and keep files UTF-8 ASCII-friendly. Components and hooks follow `PascalCase` (`DashboardShell`) and `camelCase` (`useBillingPortal`). API routes use kebab-case folders (e.g., `src/app/api/billing/route.ts`). Favor server components unless client hooks or browser APIs demand `"use client"`. Run `bun run lint` before pushing; Biome (configured in `biome.json`) enforces both lint and format rules.

## Testing Guidelines

There is no formal automated test harness yet—document manual verification steps in each PR. When adding tests, colocate them with their modules (`feature.test.tsx`) or under `apps/next-app/src/tests`. Prefer Vitest + Testing Library for unit coverage and Playwright for flow tests so they can run inside CI without extra services. Keep test names declarative (`it('renders empty state when no invoices')`). Always run `bun run build` to ensure the app compiles before merging.

## Commit & Pull Request Guidelines

Git history currently uses short imperative descriptions (`next auth working`, `clerk provider working`). Keep following that style: one feature or fix per commit, 72-character subject, and optional body for context. PRs should include: concise summary, screenshots for UI changes, database migration notes if `packages/database/` changed, manual test steps, and linked issues. Ensure PRs pass `bun run lint` and any added tests, and note required environment variables when a feature depends on new secrets.

## Security & Configuration Notes

Secrets belong in `.env.local` (at the monorepo root) and never in Git; redact example values before attaching logs. Rotate `AUTH_PROVIDER` and related keys when switching between BetterAuth, NextAuth, AuthKit, and Clerk. Database migrations should be reviewed because `db:push` can overwrite dev data—prefer `db:migrate` for anything shared. When exposing MCP or webhook endpoints, confirm URLs through `baseUrl.js` to avoid leaking staging hosts. Never use `--no-verify`; repair the hook failure instead.

## Adding New Packages

To add a new shared package:

1. Create `packages/your-package/` with `package.json` (name: `@repo/your-package`)
2. Add `tsconfig.json` extending the root config
3. Export from `src/index.ts`
4. Add as dependency in consuming apps: `"@repo/your-package": "workspace:*"`
5. Add path alias in consuming app's `tsconfig.json` if needed for IDE support
