# Next.js 16 Starter Project for Turborepo Monorepos

A production-ready starter for building full-stack Next.js apps with the App Router, TypeScript, authentication, PostgreSQL, and the shared `@repo/database` package.

This repository gives you a solid starting point instead of starting from scratch. It is built as a Turborepo monorepo with bun workspaces, so you can start from a working foundation and customize it for your product, SaaS, admin dashboard, or internal tool.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38bdf8)](https://tailwindcss.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444)](https://turbo.build/)

## Why use this starter?

- Start from a **working Next.js 16 starter** instead of scaffolding everything yourself
- Ship with **authentication, database access, UI components, and developer tooling** already wired up
- Use a **monorepo-friendly structure** with shared packages and room to grow
- Customize the project for your own product without having to replace the core app architecture first

## Features

- **Turborepo Monorepo** with bun workspaces for optimal DX
- **Next.js 16** with App Router for optimal performance
- **Single Auth Provider Architecture** - Choose your auth provider once at project init (BetterAuth, NextAuth, AuthKit, or Clerk)
- **Shared Database Package** with PostgreSQL and Drizzle ORM for type-safe queries
- **Beautiful UI** with Shadcn UI, TailwindCSS, and multiple component libraries
- **Forms** with React Hook Form and Zod validation
- **State Management** using TanStack Query for server state
- **Rate Limiting & Caching** with Redis/Upstash
- **Payment Integration** with Stripe (optional)
- **ChatGPT Apps SDK** with Model Context Protocol (MCP) support for AI integration
- **Docker Support** for easy local development
- **TUI Mode** - Interactive terminal UI when running `bun run dev`

## Monorepo Structure

```
nextjs16-starter-kit/
├── apps/
│   └── next-app/                 # Next.js 16 application
│       ├── src/                  # App source code
│       │   ├── app/              # Next.js App Router
│       │   ├── components/       # React components
│       │   ├── lib/              # Core utilities
│       │   └── ...
│       ├── public/               # Static assets
│       ├── content/              # MDX content
│       └── docs/                 # App-specific docs
│
├── packages/
│   └── database/                 # Shared database package
│       ├── src/
│       │   ├── schema.ts         # Drizzle schemas
│       │   ├── client.ts         # DB connection
│       │   └── index.ts          # Exports
│       └── drizzle.config.ts
│
├── .setup/                       # Initial-setup machinery (delete after first run)
│   ├── setup.ts                  # Unified setup (auth provider init + .env.local)
│   ├── setup-env/                # CLI args, auth phase, env helpers
│   ├── auth-init/                # Template copy / package.json mutation ops
│   ├── dev-guard.ts              # Blocks `bun run dev` until setup runs
│   ├── setup-stripe.ts           # Stripe initial config
│   ├── setup-posthog.ts          # PostHog initial config
│   ├── setup-referral.ts         # Referral system initial config
│   ├── link-env.ts               # Symlink .env.local across workspaces
│   └── templates/                # Auth provider templates
│       ├── auth/{better-auth,next-auth,authkit,clerk}/
│       └── shared/
│
├── scripts/                      # Ongoing scripts (seed, checks, integrations)
│   ├── seed-admin.ts             # Seed admin user
│   └── ...
│
├── turbo.json                    # Turborepo config
├── package.json                  # Root workspace
├── biome.json                    # Linting/formatting
└── .env.local                    # Environment variables
```

## Tech Stack

| Category | Technology |
|----------|-----------|
| Monorepo | Turborepo + bun workspaces |
| Framework | Next.js 16 with App Router |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS |
| UI Components | Shadcn UI, Radix UI, Tremor, Magic UI |
| Authentication | Single Provider (BetterAuth, NextAuth, AuthKit/WorkOS, or Clerk) |
| Database | PostgreSQL + Drizzle ORM (shared package) |
| Forms | React Hook Form + Zod |
| State Management | TanStack Query (React Query) |
| API Layer | tRPC (TypeScript RPC) |
| Caching | Redis (Upstash) |
| Payments | Stripe (optional) |
| AI Integration | ChatGPT Apps SDK + MCP |

## Getting Started

Follow the steps below to configure the starter and begin building your app.

### Prerequisites

- **Bun** (recommended) or Node.js 18+
- PostgreSQL database (local or remote)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/W3Mirror/nextjs16-starter-kit.git
   cd nextjs16-starter-kit
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run setup (auth provider + environment variables)**
   ```bash
   bun run setup
   ```

   The unified wizard:
   1. Initializes your auth provider (one-time, irreversible). You'll choose:
      - `better-auth` (default) - Self-hosted, Organizations, Email/Password
      - `next-auth` - Auth.js v5, JWT Sessions
      - `authkit` - WorkOS, Enterprise SSO
      - `clerk` - Managed, Pre-built UI
   2. Configures `.env.local` for the chosen provider plus optional services
      (Stripe, Upstash, Resend, admin user).

   > **Warning**: The auth provider choice is permanent. Re-run with `--force` to switch (backup is restored first).

   **Headless / CI:**
   ```bash
   bun run setup --yes --provider=better-auth
   ```
   In `--yes` mode, prompts accept their defaults and optional services are
   skipped unless their env vars (e.g. `STRIPE_SECRET_KEY`, `ADMIN_EMAIL`) are
   exported. See `bun run setup --help` for the full list.

4. **Push database schema**
   ```bash
   bun run db:push
   ```

5. **Seed admin user (optional)**
   ```bash
   bun run db:seed
   ```

6. **Start development server with TUI**
   ```bash
   bun run dev
   ```

   This opens an interactive Terminal UI with a sidebar showing all running tasks.

7. **Open your browser**
   Navigate to http://localhost:8801

### Docker Setup (Alternative)

```bash
docker compose up
```

This starts PostgreSQL and the Next.js app with auto-schema push.

## Available Scripts

### Root Scripts (run from monorepo root)

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all dev servers with TUI sidebar |
| `bun run build` | Build all packages and apps |
| `bun run start` | Start production server |
| `bun run lint` | Run Biome linter |
| `bun run lint:fix` | Fix lint issues |
| `bun run format` | Format code with Biome |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply migrations |
| `bun run db:push` | Push schema to database |
| `bun run db:studio` | Open Drizzle Studio GUI |
| `bun run db:seed` | Seed admin user |
| `bun run setup` | Unified setup: auth provider init + environment variables |
| `bun run setup --yes --provider=<name>` | Headless setup for CI |
| `bun run setup --force` | Re-initialize the auth provider (dangerous) |

### Filtering to specific packages

```bash
# Run dev only for next-app
bun run --filter @repo/next-app dev

# Run db commands in database package
bun run --filter @repo/database db:push
```

## Database Management

The database is a shared package at `packages/database/`. All apps import from it:

```typescript
import { db } from "@repo/database";
import { user, organization } from "@repo/database/schema";
```

### Development Workflow

```bash
# Push schema changes directly
bun run db:push

# Open visual database explorer
bun run db:studio
```

### Production Workflow

```bash
# Generate migration files
bun run db:generate

# Apply migrations
bun run db:migrate
```

## Environment Variables

Create `.env.local` at the root (or use `bun run setup`):

```env
# Database (Required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter

# App URL (Required)
NEXT_PUBLIC_APP_URL=http://localhost:8801

# Provider-specific variables are configured during `bun run setup`
# based on the auth provider chosen during the setup wizard
```

## Authentication

This starter uses a **single auth provider architecture**. You choose your auth provider once during project initialization, and only that provider's code is included in your project.

### Selecting Your Provider

Run `bun run setup` (or pass `--provider=<name>`) to select from:

| Provider | Features | Best For |
|----------|----------|----------|
| **BetterAuth** (default) | Self-hosted, Organizations, Email/Password, Social OAuth | Full control, privacy-focused apps |
| **NextAuth** | Auth.js v5, JWT Sessions, Multiple providers | Existing Auth.js experience |
| **AuthKit** | WorkOS integration, Enterprise SSO, SAML | B2B/Enterprise applications |
| **Clerk** | Managed service, Pre-built UI, User management | Rapid development, managed auth |

### What Happens During Init

1. You select a provider (or use `--provider=<name>` flag)
2. Existing auth files are backed up to `.auth-backup/`
3. Template files for your provider are copied to the project
4. Package dependencies are updated
5. Unused provider code is removed
6. A `.auth-provider.lock` file is created (do not commit this)

### Switching Providers

The auth provider choice is **intentionally permanent** to keep the codebase clean. If you need to switch:

```bash
# Option 1: Start fresh
rm -rf .auth-provider.lock .auth-backup
bun run setup

# Option 2: Force re-init (restores from backup first)
bun run setup --force
```

### Direct Provider Selection

Skip the interactive prompt:

```bash
bun run setup --provider=better-auth
bun run setup --provider=next-auth
bun run setup --provider=authkit
bun run setup --provider=clerk
```

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting/Formatting**: Biome (run `bun run lint`)
- **Components**: Server Components by default, `"use client"` when needed
- **Imports**: Use path aliases (`@/*` for app, `@repo/database` for db)

### Database Operations

```typescript
import { db } from "@repo/database";
import { user } from "@repo/database/schema";
import { eq } from "drizzle-orm";

const users = await db().select().from(user).where(eq(user.email, email));
```

### Adding New Packages

```bash
# Create new package
mkdir -p packages/my-package/src
# Add package.json with name: "@repo/my-package"
# Update root package.json workspaces if needed
```

## ChatGPT Apps SDK Integration

This starter includes ChatGPT Apps SDK support for running inside ChatGPT.

1. Deploy to Vercel
2. Connect via MCP: `https://your-app.vercel.app/mcp`
3. Test with "Show me the content" in ChatGPT

See [CHATGPT_APPS_SDK.md](./apps/next-app/docs/CHATGPT_APPS_SDK.md) for details.

## Deployment

### Vercel

The `vercel.json` is configured for monorepo deployment:

```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "nextjs",
  "outputDirectory": "apps/next-app/.next"
}
```

### Docker

```bash
docker build -t nextjs-starter .
docker run -p 8801:8801 nextjs-starter
```

## Troubleshooting

### Auth Provider Issues

**"No auth provider lock file found"**
```bash
# Run setup — it initializes auth if .auth-provider.lock is missing
bun run setup
```

**"Auth provider already initialized"**
```bash
# Use --force to re-initialize (will restore backup first)
bun run setup --force
```

### Dependency Issues
```bash
bun install
```

### Database Connection
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env.local`

### TypeScript Errors
```bash
bun run lint
bun run build
```

### Cache Issues
```bash
rm -rf .turbo node_modules apps/*/node_modules packages/*/node_modules
bun install
```

## Resources

- **Next.js**: https://nextjs.org/docs
- **Turborepo**: https://turbo.build/repo/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **BetterAuth**: https://www.better-auth.com/docs
- **Shadcn UI**: https://ui.shadcn.com
- **Biome**: https://biomejs.dev

## License

MIT License - see [LICENSE](LICENSE)

---

**Made with love by the W3DevStarter team**
