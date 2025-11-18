# Copilot Instructions for NextJS 16 Starter Kit

## Project Overview

This is a modern, production-ready Next.js 16 starter template designed for building full-stack web applications with best practices baked in. The project uses the App Router architecture and includes authentication, database integration, and a comprehensive UI component library.

## Tech Stack

- **Package Manager**: Bun (v1.3+)
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode enabled
- **Styling**: TailwindCSS with Shadcn UI components
- **Authentication**: BetterAuth (self-hosted, TypeScript-first auth solution)
- **Database**: PostgreSQL with Drizzle ORM
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query (React Query)
- **Caching**: Redis via Upstash
- **Payments**: Stripe integration (optional)
- **UI Components**: Shadcn UI, Radix UI, Tremor, Magic UI
- **Icons**: Lucide React, Tabler Icons, React Icons

## Project Structure

```
/app                    # Next.js 16 App Router pages and layouts
  /(auth)              # Authentication routes (sign-in, sign-up)
  /(marketing)         # Public marketing pages
  /api                 # API routes and webhooks
  /dashboard           # Protected dashboard routes
/components            # Reusable React components
  /ui                  # Shadcn UI components
  /form                # Form components
  /magicui             # Magic UI components
  /LandingPage         # Landing page sections
/lib                   # Core utilities and configurations
  /db                  # Database configuration and schema
/utils                 # Helper functions and utilities
/public                # Static assets
```

## Coding Standards

### TypeScript

- **Strict Mode**: Always enabled. All code must be fully typed.
- **No `any` types**: Use proper TypeScript types or `unknown` with type guards.
- **Path Aliases**: Use `@/` for imports from the root directory.
- **Type Inference**: Prefer type inference where possible, but add explicit types for function parameters and return values.

### React and Next.js

- **Server Components**: Use Server Components by default. Add `"use client"` directive only when needed (hooks, event handlers, browser APIs).
- **Async Components**: Server Components can be async - use this for data fetching.
- **File Naming**: 
  - Pages: `page.tsx`
  - Layouts: `layout.tsx`
  - Components: PascalCase (e.g., `UserProfile.tsx`)
  - Utilities: camelCase (e.g., `formatDate.ts`)
- **Export Pattern**: Use default exports for pages and layouts, named exports for components and utilities.

### Database Operations

- **ORM**: Use Drizzle ORM for all database operations.
- **Schema Location**: Database schema is in `lib/db/schema.ts`.
- **Connection**: Import `db` from `@/lib/db` and call `db()` to get the database instance.
- **Type Safety**: Leverage Drizzle's TypeScript types for queries.
- **Example**:
  ```typescript
  import { db } from "@/lib/db";
  import { user } from "@/lib/db/schema";
  import { eq } from "drizzle-orm";
  
  const users = await db().select().from(user).where(eq(user.email, email));
  ```

### Forms and Validation

- **Form Library**: Use React Hook Form for all forms.
- **Validation**: Use Zod schemas for validation.
- **Pattern**:
  ```typescript
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { z } from "zod";
  
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
  });
  
  const form = useForm({
    resolver: zodResolver(schema),
  });
  ```

### State Management

- **Server State**: Use TanStack Query for API/database data.
- **Client State**: Use React hooks (useState, useReducer) for local state.
- **Avoid Global State**: Prefer composition and prop drilling for simple cases.

### Styling

- **TailwindCSS**: Use Tailwind utility classes for styling.
- **Component Library**: Use Shadcn UI components when available.
- **Custom Styles**: Avoid custom CSS files; use Tailwind classes or CSS-in-JS if absolutely necessary.
- **Responsive Design**: Always consider mobile-first design with Tailwind responsive prefixes.

### Authentication

- **Provider**: BetterAuth handles all authentication (self-hosted, TypeScript-first).
- **Configuration**: Auth configuration is in `lib/auth.ts` and `lib/auth-client.ts`.
- **Middleware**: Authentication middleware is in `middleware.ts`.
- **Protected Routes**: Use BetterAuth's built-in route protection.
- **User Data**: Access user data via BetterAuth client hooks.
- **Setup**: Requires `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL` environment variables.

## Development Workflow

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in required environment variables (BetterAuth secret, database URL)
3. Generate BetterAuth secret with `openssl rand -base64 32`
4. Run `bun install` to install dependencies

### ⚠️ CRITICAL: Starting the Development Server

**Before running the dev server, you MUST follow this sequence:**

1. **Start the database with Docker Compose** (if not already running):
   ```bash
   docker compose up postgres
   ```
   Or start all services including the database:
   ```bash
   docker compose up -d postgres
   ```

2. **Sync the database schema**:
   ```bash
   bun run db:push
   ```
   This pushes the current schema from `lib/db/schema.ts` to the database.

3. **Start the development server**:
   ```bash
   bun run dev
   ```

**Why this order matters:**
- The Next.js application requires a running PostgreSQL database to function
- Database schema must be synced before the app starts to avoid runtime errors
- Skipping these steps will cause connection errors and application failures

**For convenience, you can also use:**
```bash
docker compose up
```
This starts both the database and the app, and automatically runs `db:push` before starting the dev server (see `docker-compose.yml`).

### Database Management

- **Push Schema**: `bun run db:push` - Push schema changes to database (development)
- **Generate Migrations**: `bun run db:generate` - Generate migration files
- **Run Migrations**: `bun run db:migrate` - Apply migrations (production)
- **Database Studio**: `bun run db:studio` - Open Drizzle Studio GUI

### Running the Application

- **Development**: `bun run dev` - Start dev server on port 3000 (⚠️ see "Starting the Development Server" section above for required prerequisites)
- **Build**: `bun run build` - Create production build
- **Start**: `bun run start` - Run production build
- **Lint**: `bun run lint` - Run ESLint

**Important:** Always ensure the database is running and the schema is synced before running `bun run dev`. See the "Starting the Development Server" section above.

### Docker Development

- **Start**: `docker compose up` - Start PostgreSQL and Next.js
- **Stop**: `docker compose down` - Stop all services
- **Rebuild**: `docker compose up --build` - Rebuild and start

## Best Practices for Issues and PRs

### When Creating Issues

- **Clear Problem Statement**: Describe what needs to be fixed or built.
- **Acceptance Criteria**: List specific requirements for completion.
- **File Context**: Mention which files or areas of code are affected.
- **Breaking Changes**: Note if this changes existing behavior.

### When Implementing Changes

- **Minimal Changes**: Make the smallest changes necessary to solve the problem.
- **Test Before Committing**: Run `bun run lint` and `bun run build` to catch errors.
- **Development Environment**: Before testing changes locally:
  1. Ensure database is running: `docker compose up -d postgres`
  2. Sync schema if you made database changes: `bun run db:push`
  3. Start dev server: `bun run dev`
- **Database Changes**: If schema changes are needed:
  1. Update `lib/db/schema.ts`
  2. Run `bun run db:push` (dev) or `bun run db:generate` (prod)
  3. Update affected queries and types
- **Component Changes**: Keep components focused and single-purpose.
- **Type Safety**: Ensure all TypeScript types are correct; no type errors allowed.

### Common Patterns

#### Creating a New Page

```typescript
// app/my-page/page.tsx
export default async function MyPage() {
  // Server-side data fetching
  const data = await fetchData();
  
  return (
    <div>
      <h1>{data.title}</h1>
    </div>
  );
}
```

#### Creating a Client Component

```typescript
// components/MyComponent.tsx
"use client";

import { useState } from "react";

export function MyComponent() {
  const [state, setState] = useState(false);
  
  return (
    <button onClick={() => setState(!state)}>
      {state ? "On" : "Off"}
    </button>
  );
}
```

#### Database Query in API Route

```typescript
// app/api/users/route.ts
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const users = await db().select().from(user);
  return NextResponse.json(users);
}
```

## Security Considerations

- **Environment Variables**: Never commit `.env.local` or expose secrets.
- **API Routes**: Always validate input and check authentication.
- **Database Queries**: Use parameterized queries (Drizzle handles this).
- **BetterAuth**: Secure the `BETTER_AUTH_SECRET` and never expose it publicly.
- **Rate Limiting**: Use Upstash rate limiting for public endpoints.

## Testing Guidelines

- **Build Test**: Always run `bun run build` before submitting changes.
- **Lint Check**: Run `bun run lint` to catch style issues.
- **Manual Testing**: Test the UI in the browser for visual changes.
- **Database Testing**: Test with actual PostgreSQL database, not mocks.

## Common Pitfalls to Avoid

1. **Using Client Components Unnecessarily**: Default to Server Components; only add `"use client"` when required.
2. **Mixing ORM Libraries**: This project uses Drizzle, not Prisma or Supabase.
3. **Ignoring TypeScript Errors**: All TS errors must be resolved; no `@ts-ignore` comments.
4. **Breaking Docker Setup**: Ensure changes work with both local and Docker development.
5. **Modifying node_modules**: Never edit files in `node_modules`; use proper configuration files.

## Migration Notes

This project was recently migrated from Prisma to Drizzle ORM. See `MIGRATION.md` for details. When working with database code:

- Use Drizzle patterns, not Prisma patterns
- The schema is in `lib/db/schema.ts`, not `prisma/schema.prisma`
- Use `db()` function, not `prisma` or `supabase` clients

## Getting Help

- **Next.js Docs**: https://nextjs.org/docs
- **Drizzle Docs**: https://orm.drizzle.team/docs
- **BetterAuth Docs**: https://www.better-auth.com/docs
- **Shadcn UI**: https://ui.shadcn.com
- **TailwindCSS**: https://tailwindcss.com/docs

## Summary

This is a production-ready Next.js starter with opinionated choices for maximum developer productivity. Follow these guidelines to maintain consistency and quality across the codebase.
