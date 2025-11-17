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
2. Create a `.env.local` file with the required environment variables (see below)
3. Run the following command to start the application with Docker Compose:

```bash
docker-compose up
```

This will start:
- PostgreSQL database on port 5432
- Next.js application on port 3000

The database schema will be automatically pushed on startup.

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

- `npm run db:generate` - Generate migration files
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema to database (useful for development)
- `npm run db:studio` - Open Drizzle Studio to view your database

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
