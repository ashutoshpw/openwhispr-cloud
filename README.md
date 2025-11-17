## NextJS 16 Starter Template 

## Tech Stack
NextJS 16 - Full Stack framework 

TailwindCSS - CSS framework

Shadcn UI - Component library

Clerk - Authentication

React Hook Form - Forms

Zod - Type Schema

Tanstack Query - Querying Data & State Management

Drizzle ORM - Database ORM

PostgreSQL - Database

Redis & Upstash - Rate limit + Caching

## Getting Started

### Using Docker (Recommended for local development)

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in the required environment variables
3. Run the following command to start the application with Docker Compose:

```bash
docker compose up
```

This will start:
- PostgreSQL database on port 5432
- Next.js application on port 3000

The database schema will be automatically pushed on startup.

To stop the services:
```bash
docker compose down
```

To rebuild after changes:
```bash
docker compose up --build
```

### Manual Setup

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Set up your environment variables (see below)

3. Push the database schema:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

## Database Commands

- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:migrate` - Run migrations against the database
- `npm run db:push` - Push schema to database directly (useful for development)
- `npm run db:studio` - Open Drizzle Studio (a GUI) to view and edit your database

## Migration from Prisma

This project has been migrated from Prisma to Drizzle ORM. If you're coming from an older version:

1. The Prisma schema has been converted to Drizzle schema in `lib/db/schema.ts`
2. All database operations now use Drizzle instead of Prisma Client or Supabase
3. The `@prisma/client` and Supabase dependencies have been removed
4. Use the new Drizzle commands listed above for database management

## ENV variables needed

You'll need to signup at Clerk.com

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/

NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

WEBHOOK_SECRET=

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter

DIRECT_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter
