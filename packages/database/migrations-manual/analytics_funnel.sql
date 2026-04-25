-- Manual migration: analytics_funnel table for /adminx/analytics page-flow funnels.
-- Drizzle-kit generate is currently blocked by unrelated email-infra schema drift,
-- so this is a hand-written SQL migration. Run with:
--   psql "$DATABASE_URL" -f packages/database/migrations-manual/analytics_funnel.sql
-- Once the drift is resolved, drizzle-kit will detect this table as already-applied
-- and a generated migration can be skipped or no-op'd.

CREATE TABLE IF NOT EXISTS "analytics_funnel" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "steps" jsonb NOT NULL,
  "order_index" integer DEFAULT 0 NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
