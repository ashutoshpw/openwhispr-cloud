-- Manual migration: M3 epic — Pricing Page Management & Referral System.
-- Drizzle-kit generate is currently blocked by unrelated email-infra schema drift,
-- so this is a hand-written SQL migration. Run with:
--   psql "$DATABASE_URL" -f packages/database/migrations-manual/m3_pricing_referrals.sql
-- Once the drift is resolved, drizzle-kit will detect these changes as already-applied
-- and a generated migration can be skipped or no-op'd.

-- ============================================================================
-- A1. Extend plan_tier with public pricing-page display columns
-- ============================================================================
ALTER TABLE "plan_tier"
  ADD COLUMN IF NOT EXISTS "stripe_product_id" text,
  ADD COLUMN IF NOT EXISTS "monthly_price_id" text,
  ADD COLUMN IF NOT EXISTS "yearly_price_id" text,
  ADD COLUMN IF NOT EXISTS "monthly_display_price" text,
  ADD COLUMN IF NOT EXISTS "yearly_display_price" text,
  ADD COLUMN IF NOT EXISTS "cost_label" text,
  ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_popular" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_exclusive" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "action_label" text,
  ADD COLUMN IF NOT EXISTS "hide_from_pricing" boolean DEFAULT false NOT NULL;

-- ============================================================================
-- A5. Fix referral_config.min_plan_tier default; add auto-apply + window fields
-- ============================================================================
ALTER TABLE "referral_config"
  ALTER COLUMN "min_plan_tier" SET DEFAULT 'tier1',
  ADD COLUMN IF NOT EXISTS "auto_apply" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "approval_window_days" integer DEFAULT 30 NOT NULL;

-- Backfill any rows that still have the old underscored default
UPDATE "referral_config" SET "min_plan_tier" = 'tier1' WHERE "min_plan_tier" = 'tier_1';

-- ============================================================================
-- A2. referral_intents — staging row created when /r/[code] is visited
-- ============================================================================
CREATE TABLE IF NOT EXISTS "referral_intents" (
  "id" text PRIMARY KEY NOT NULL,
  "referral_code" varchar(20) NOT NULL,
  "referrer_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "captured_at" timestamp DEFAULT now() NOT NULL,
  "claimed_at" timestamp,
  "claimed_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "expires_at" timestamp
);

-- ============================================================================
-- A3. referral_lifecycle_log — audit trail of every status transition
-- ============================================================================
CREATE TABLE IF NOT EXISTS "referral_lifecycle_log" (
  "id" text PRIMARY KEY NOT NULL,
  "referral_id" text NOT NULL REFERENCES "referrals"("id") ON DELETE CASCADE,
  "from_status" text,
  "to_status" text NOT NULL,
  "reason" text,
  "stripe_event_id" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- A4. referral_credit_grants — idempotent reward ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS "referral_credit_grants" (
  "id" text PRIMARY KEY NOT NULL,
  "referral_id" text NOT NULL REFERENCES "referrals"("id") ON DELETE CASCADE,
  "recipient_user_id" text NOT NULL REFERENCES "user"("id"),
  "recipient_role" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" varchar(3) NOT NULL,
  "stripe_customer_id" text,
  "stripe_invoice_id" text,
  "stripe_balance_transaction_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "applied_at" timestamp,
  "failure_reason" text,
  "rejected_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Idempotency: one grant per (invoice, recipient_role).
-- nulls are distinct, so multiple null-invoice rows (e.g., referee signup credits) coexist.
CREATE UNIQUE INDEX IF NOT EXISTS "referral_credit_invoice_role_unique"
  ON "referral_credit_grants" ("stripe_invoice_id", "recipient_role");

CREATE INDEX IF NOT EXISTS "referral_credit_referral_idx"
  ON "referral_credit_grants" ("referral_id");

CREATE INDEX IF NOT EXISTS "referral_credit_status_idx"
  ON "referral_credit_grants" ("status");
