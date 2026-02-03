# NextJS 16 Starter Kit - Turborepo Monorepo

A modern, production-ready Next.js 16 starter template built as a Turborepo monorepo with bun workspaces. Features full-stack web applications with authentication, database integration, and a comprehensive UI component library.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8)](https://tailwindcss.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444)](https://turbo.build/)

## Features

- **Turborepo Monorepo** with bun workspaces for optimal DX
- **Next.js 16** with App Router for optimal performance
- **Unified Authentication** - Switchable auth layer supporting BetterAuth, NextAuth, AuthKit (WorkOS), and Clerk
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
├── scripts/                      # Root-level scripts
│   ├── setup.ts                  # Interactive setup
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
| Authentication | Unified Auth Layer (BetterAuth, NextAuth, AuthKit/WorkOS, Clerk) |
| Database | PostgreSQL + Drizzle ORM (shared package) |
| Forms | React Hook Form + Zod |
| State Management | TanStack Query (React Query) |
| API Layer | tRPC (TypeScript RPC) |
| Caching | Redis (Upstash) |
| Payments | Stripe (optional) |
| AI Integration | ChatGPT Apps SDK + MCP |

## Getting Started

### Prerequisites

- **Bun** (recommended) or Node.js 18+
- PostgreSQL database (local or remote)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/W3DevStarter/nextjs16-starter-kit.git
   cd nextjs16-starter-kit
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Or use the interactive setup:
   bun run setup
   ```

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
| `bun run setup` | Interactive environment setup |

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

Create `.env.local` at the root:

```env
# Database (Required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter

# Auth Provider (Required)
AUTH_PROVIDER=better-auth  # or: next-auth, authkit, clerk-dev
NEXT_PUBLIC_APP_URL=http://localhost:8801

# BetterAuth (if using better-auth)
BETTER_AUTH_SECRET=<generate-with-openssl-rand>
BETTER_AUTH_URL=http://localhost:8801

# See .env.example for all options
```

Use `bun run setup` for an interactive configuration wizard.

## Authentication Providers

Switch providers by changing `AUTH_PROVIDER`:

| Provider | Value | Features |
|----------|-------|----------|
| BetterAuth | `better-auth` | Self-hosted, Organizations, Email/Password |
| NextAuth | `next-auth` | Auth.js v5, JWT Sessions |
| AuthKit | `authkit` | WorkOS, Enterprise SSO |
| Clerk | `clerk-dev` | Managed, Pre-built UI |

See provider documentation:
- [BetterAuth README](./apps/next-app/src/lib/auth/providers/better-auth/README.md)
- [NextAuth README](./apps/next-app/src/lib/auth/providers/next-auth/README.md)
- [AuthKit README](./apps/next-app/src/lib/auth/providers/authkit/README.md)
- [Clerk README](./apps/next-app/src/lib/auth/providers/clerk-dev/README.md)

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
