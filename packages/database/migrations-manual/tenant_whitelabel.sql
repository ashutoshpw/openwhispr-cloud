CREATE TABLE IF NOT EXISTS "tenant" (
  "id" text PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "platform_name" text NOT NULL,
  "logo_url" text,
  "favicon_url" text,
  "support_email" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tenant_domain" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenant"("id") ON DELETE cascade,
  "domain" text NOT NULL UNIQUE,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tenant_domain_tenant_id_idx" ON "tenant_domain" ("tenant_id");

INSERT INTO "tenant" ("id", "slug", "name", "platform_name")
VALUES ('default', 'default', 'Default Platform', 'Default Platform')
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "public_email" text;
UPDATE "user" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
UPDATE "user" SET "public_email" = "email" WHERE "public_email" IS NULL;
UPDATE "user"
SET "email" = "tenant_id" || ':' || lower("email")
WHERE position(':' in "email") = 0;
ALTER TABLE "user" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "user" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "public_email" SET NOT NULL;

ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "tenant_id" text;
UPDATE "session" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
ALTER TABLE "session" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "session" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "tenant_id" text;
UPDATE "account" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
ALTER TABLE "account" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "account" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "tenant_id" text;
UPDATE "verification" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
ALTER TABLE "verification" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "verification" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "tenant_id" text;
UPDATE "organization" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
ALTER TABLE "organization" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "organization" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "tenant_id" text;
UPDATE "member" SET "tenant_id" = o."tenant_id"
FROM "organization" o
WHERE "member"."organization_id" = o."id" AND "member"."tenant_id" IS NULL;
UPDATE "member" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
ALTER TABLE "member" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "member" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "tenant_id" text;
UPDATE "invitation" SET "tenant_id" = o."tenant_id"
FROM "organization" o
WHERE "invitation"."organization_id" = o."id" AND "invitation"."tenant_id" IS NULL;
UPDATE "invitation" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
ALTER TABLE "invitation" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "invitation" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "tenant_id" text;
UPDATE "project" SET "tenant_id" = o."tenant_id"
FROM "organization" o
WHERE "project"."organization_id" = o."id" AND "project"."tenant_id" IS NULL;
UPDATE "project" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
ALTER TABLE "project" ALTER COLUMN "tenant_id" SET DEFAULT 'default';
ALTER TABLE "project" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "oauth_application" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT 'default';
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT 'default';
ALTER TABLE "oauth_consent" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT 'default';
ALTER TABLE "two_factor" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT 'default';
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT 'default';

DO $$
BEGIN
  ALTER TABLE "user" ADD CONSTRAINT "user_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "organization" ADD CONSTRAINT "organization_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "member" ADD CONSTRAINT "member_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "invitation" ADD CONSTRAINT "invitation_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project" ADD CONSTRAINT "project_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "organization_slug_unique";
ALTER TABLE "organization" DROP CONSTRAINT IF EXISTS "organization_slug_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "organization_tenant_slug_unique" ON "organization" ("tenant_id", "slug");

CREATE UNIQUE INDEX IF NOT EXISTS "user_tenant_public_email_unique" ON "user" ("tenant_id", "public_email");
DROP INDEX IF EXISTS "user_username_unique";
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_username_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "user_tenant_username_unique" ON "user" ("tenant_id", "username");
