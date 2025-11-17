# Prisma to Drizzle Migration Guide

This document outlines the migration from Prisma to Drizzle ORM completed in this project.

## What Changed

### Dependencies Removed
- `@prisma/client` - Prisma ORM client
- `prisma` - Prisma CLI
- `@supabase/auth-helpers-nextjs` - Supabase auth helpers
- `@supabase/supabase-js` - Supabase JavaScript client

### Dependencies Added
- `drizzle-orm` - Drizzle ORM core
- `postgres` - PostgreSQL driver for Node.js
- `drizzle-kit` (dev) - Drizzle CLI for migrations and schema management

## Schema Conversion

### Prisma Schema (Before)
Located in: `prisma/schema.prisma`

```prisma
model user {
  id                Int      @id @default(autoincrement())
  created_time      DateTime @default(now())
  email             String   @unique
  first_name        String?
  last_name         String?
  gender            String?
  profile_image_url String?
  user_id           String   @unique
}

model payments {
  id              Int      @id @default(autoincrement())
  created_time    DateTime @default(now())
  payment         String
  type            String
  email           String
  amount          String
  payment_time    String
  payment_date    String
  receipt_email   String
  receipt_url     String
  payment_details String
  billing_details String
  currency        String
}
```

### Drizzle Schema (After)
Located in: `lib/db/schema.ts`

```typescript
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  created_time: timestamp('created_time').defaultNow().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  first_name: varchar('first_name', { length: 255 }),
  last_name: varchar('last_name', { length: 255 }),
  gender: varchar('gender', { length: 50 }),
  profile_image_url: varchar('profile_image_url', { length: 500 }),
  user_id: varchar('user_id', { length: 255 }).unique().notNull(),
});

export const payments = pgTable('payments', {
  // ... similar structure
});
```

## Database Connection

### Before (Supabase)
```typescript
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabase = createServerComponentClient({ cookies });
```

### After (Drizzle)
```typescript
import { db } from "@/lib/db";

// Use db() to access the database
const result = await db().select().from(user);
```

## Query Examples

### Creating a User

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from("User")
  .insert([{ email, first_name, last_name, profile_image_url, user_id }])
  .select();
```

**After (Drizzle):**
```typescript
const data = await db()
  .insert(user)
  .values({ email, first_name, last_name, profile_image_url, user_id })
  .returning();
```

### Updating a User

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from("User")
  .update([{ email, first_name, last_name, profile_image_url, user_id }])
  .eq("email", email)
  .select();
```

**After (Drizzle):**
```typescript
const data = await db()
  .update(user)
  .set({ email, first_name, last_name, profile_image_url, user_id })
  .where(eq(user.email, email))
  .returning();
```

### Selecting Users

**Before (Supabase):**
```typescript
let { data: user, error } = await supabase.from("User").select("*");
```

**After (Drizzle):**
```typescript
const users = await db().select().from(user);
```

## Files Modified

1. **lib/db/index.ts** - Database connection setup
2. **lib/db/schema.ts** - Schema definitions
3. **utils/db/userCreate.ts** - User creation logic
4. **utils/db/userUpdate.ts** - User update logic
5. **utils/db/registerPayment.ts** - Payment registration logic
6. **utils/db/template/template.ts** - Template query function
7. **drizzle.config.ts** - Drizzle configuration
8. **package.json** - Updated dependencies and added database scripts

## New Scripts

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

## Docker Support

Added `docker-compose.yml` and `Dockerfile` to support local development with:
- PostgreSQL database container
- Next.js application container
- Automatic schema pushing on startup

## Benefits of This Migration

1. **Type Safety**: Drizzle provides better TypeScript types out of the box
2. **Performance**: Direct PostgreSQL connection without additional layers
3. **Developer Experience**: Drizzle Studio for database inspection
4. **Flexibility**: Full control over SQL queries when needed
5. **Lightweight**: Fewer dependencies and smaller bundle size

## Environment Variables

The following environment variables are now used:
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (for migrations)

Example for local development:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter
```

## Notes

- The database connection is lazily initialized to avoid build-time errors
- All queries use the `db()` function which initializes the connection on first use
- Error handling has been improved with better logging
- The old Prisma and Supabase code has been completely removed
