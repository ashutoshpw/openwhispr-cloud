import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./schema";

// ============================================================================
// OpenWhispr platform (API keys, usage, analytics, onboarding)
// ============================================================================

export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    // personal | workspace
    kind: text("kind").notNull().default("personal"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    // sha256 hex of the full key; raw shown once at creation.
    keyHash: text("key_hash").notNull().unique(),
    // Display prefix, e.g. "owk_live_abcd" / "ow_wks_live_abcd".
    keyPrefix: text("key_prefix").notNull(),
    scopes: jsonb("scopes").notNull(), // string[]
    expiresInDays: integer("expires_in_days"),
    expiresAt: timestamp("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("api_key_user_idx").on(table.userId),
    index("api_key_org_idx").on(table.organizationId),
  ],
);

// ----------------------------------------------------------------------------
// Usage & analytics
// ----------------------------------------------------------------------------

export const usagePeriod = pgTable(
  "usage_period",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    wordsUsed: integer("words_used").default(0).notNull(),
    wordLimit: integer("word_limit").notNull(),
    plan: text("plan").notNull().default("free"), // free | pro | business
    resetAt: timestamp("reset_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("usage_period_user_idx").on(table.userId, table.periodEnd)],
);

export const analyticsEvent = pgTable(
  "analytics_event",
  {
    id: text("id").primaryKey(),
    clientEventId: text("client_event_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    // Per-event metrics: words, dictation duration, wpm, counter version...
    words: integer("words"),
    spokenDurationMs: integer("spoken_duration_ms"),
    counterVersion: integer("counter_version"),
    occurredAt: timestamp("occurred_at").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("analytics_event_client_unique").on(
      table.userId,
      table.clientEventId,
    ),
    index("analytics_event_user_time_idx").on(table.userId, table.occurredAt),
  ],
);

export const analyticsDaily = pgTable(
  "analytics_daily",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD in user's timezone
    timeZone: text("time_zone").notNull().default("UTC"),
    words: integer("words").default(0).notNull(),
    dictations: integer("dictations").default(0).notNull(),
    spokenDurationMs: integer("spoken_duration_ms").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("analytics_daily_unique").on(table.userId, table.date),
  ],
);

export const leaderboardParticipation = pgTable("leaderboard_participation", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(false).notNull(),
  timeZone: text("time_zone").default("UTC").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ----------------------------------------------------------------------------
// Enterprise & policy
// ----------------------------------------------------------------------------

export const enterpriseProviderConfig = pgTable(
  "enterprise_provider_config",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // bedrock | azure
    provider: text("provider").notNull(),
    // Provider-specific non-secret config (region, role ARN, tenant id, ...)
    config: jsonb("config").notNull(),
    // Encrypted provider secrets (access key / client secret), AES-256-GCM
    // via INTEGRATION_ENCRYPTION_KEY.
    secretEncrypted: text("secret_encrypted"),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("enterprise_provider_unique").on(
      table.organizationId,
      table.provider,
    ),
  ],
);

export const workspacePolicy = pgTable("workspace_policy", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: "cascade" }),
  managed: boolean("managed").default(false).notNull(),
  // Feature gates, e.g. {"screenContextEnabled": false}
  features: jsonb("features"),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const onboardingIntent = pgTable("onboarding_intent", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  useCases: jsonb("use_cases"), // string[]
  note: text("note"),
  spokenLanguages: jsonb("spoken_languages"), // string[]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Single-use tokens (admin console handoff, device-erase pairing).
export const oneTimeToken = pgTable(
  "one_time_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: text("purpose").notNull().default("admin_handoff"),
    // Optional opaque payload (JSON string) the consumer can read once.
    payload: jsonb("payload"),
    usedAt: timestamp("used_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("one_time_token_user_idx").on(table.userId)],
);

export type ApiKey = typeof apiKey.$inferSelect;
export type UsagePeriod = typeof usagePeriod.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;
export type LeaderboardParticipation =
  typeof leaderboardParticipation.$inferSelect;
export type EnterpriseProviderConfig =
  typeof enterpriseProviderConfig.$inferSelect;
export type WorkspacePolicy = typeof workspacePolicy.$inferSelect;
export type OnboardingIntent = typeof onboardingIntent.$inferSelect;
export type OneTimeToken = typeof oneTimeToken.$inferSelect;
