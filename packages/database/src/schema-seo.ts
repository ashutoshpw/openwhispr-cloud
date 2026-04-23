import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================
// SEO KEYWORDS — definitions
// ============================================

export const seoKeywords = pgTable(
  "seo_keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    keyword: text("keyword").notNull(),
    cluster: text("cluster"),
    intent: text("intent"),
    targetPath: text("target_path"),
    priority: text("priority").default("medium"),
    searchVolume: integer("search_volume"),
    difficulty: text("difficulty"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
  },
  (table) => [
    unique("seo_keywords_keyword_unique").on(table.keyword),
    index("seo_keywords_active_priority_idx").on(
      table.isActive,
      table.priority,
    ),
    index("seo_keywords_cluster_idx").on(table.cluster),
  ],
);

// ============================================
// SEO KEYWORD SNAPSHOTS — append-only rank history
// ============================================

export const seoKeywordSnapshots = pgTable(
  "seo_keyword_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    keywordId: uuid("keyword_id")
      .notNull()
      .references(() => seoKeywords.id, { onDelete: "cascade" }),
    capturedAt: bigint("captured_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
    position: integer("position"),
    rankingUrl: text("ranking_url"),
    source: text("source").notNull().default("manual"),
  },
  (table) => [
    index("seo_keyword_snapshots_keyword_captured_idx").on(
      table.keywordId,
      table.capturedAt,
    ),
    index("seo_keyword_snapshots_captured_idx").on(table.capturedAt),
  ],
);

// ============================================
// SEO GSC DAILY — Search Console daily aggregates
// ============================================

export const seoGscDaily = pgTable(
  "seo_gsc_daily",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: text("date").notNull(),
    page: text("page").notNull(),
    query: text("query"),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: real("ctr").notNull().default(0),
    position: real("position").notNull().default(0),
    fetchedAt: bigint("fetched_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
  },
  (table) => [
    unique("seo_gsc_daily_date_page_query_unique").on(
      table.date,
      table.page,
      table.query,
    ),
    index("seo_gsc_daily_date_idx").on(table.date),
    index("seo_gsc_daily_page_date_idx").on(table.page, table.date),
  ],
);

// ============================================
// SEO PAGES — content pipeline + workflow
// ============================================

export const seoPages = pgTable(
  "seo_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    path: text("path").notNull(),
    title: text("title").notNull(),
    type: text("type").notNull().default("blog"),
    cluster: text("cluster"),
    status: text("status").notNull().default("idea"),
    primaryKeywordId: uuid("primary_keyword_id").references(
      () => seoKeywords.id,
      { onDelete: "set null" },
    ),
    assignedTo: text("assigned_to"),
    dueDate: text("due_date"),
    publishedAt: bigint("published_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
  },
  (table) => [
    unique("seo_pages_path_unique").on(table.path),
    index("seo_pages_status_idx").on(table.status),
    index("seo_pages_cluster_idx").on(table.cluster),
  ],
);

// ============================================
// SEO ANNOTATIONS — context for chart spikes
// ============================================

export const seoAnnotations = pgTable(
  "seo_annotations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: text("date").notNull(),
    note: text("note").notNull(),
    path: text("path"),
    keywordId: uuid("keyword_id").references(() => seoKeywords.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
  },
  (table) => [
    index("seo_annotations_date_idx").on(table.date),
    index("seo_annotations_keyword_idx").on(table.keywordId),
    index("seo_annotations_path_idx").on(table.path),
  ],
);

// ============================================
// AIEO — AI Engine Optimization
// ============================================

export const seoEngines = pgTable("seo_engines", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  vendor: text("vendor").notNull(),
  modelId: text("model_id"),
  isActive: boolean("is_active").notNull().default(true),
  defaultCostCents: integer("default_cost_cents").notNull().default(1),
  config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(sql`EXTRACT(epoch FROM now())::bigint`),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .default(sql`EXTRACT(epoch FROM now())::bigint`),
});

export const seoPrompts = pgTable(
  "seo_prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prompt: text("prompt").notNull(),
    intent: text("intent"),
    cluster: text("cluster"),
    priority: text("priority").notNull().default("medium"),
    isActive: boolean("is_active").notNull().default(true),
    linkedKeywordId: uuid("linked_keyword_id").references(
      () => seoKeywords.id,
      { onDelete: "set null" },
    ),
    targetPath: text("target_path"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
  },
  (table) => [
    unique("seo_prompts_prompt_unique").on(table.prompt),
    index("seo_prompts_active_priority_idx").on(table.isActive, table.priority),
    index("seo_prompts_cluster_idx").on(table.cluster),
    index("seo_prompts_linked_keyword_idx").on(table.linkedKeywordId),
  ],
);

export const seoPromptSnapshots = pgTable(
  "seo_prompt_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => seoPrompts.id, { onDelete: "cascade" }),
    engineId: text("engine_id")
      .notNull()
      .references(() => seoEngines.id, { onDelete: "restrict" }),
    capturedAt: bigint("captured_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
    brandMentioned: boolean("brand_mentioned").notNull().default(false),
    mentionRank: integer("mention_rank"),
    sentiment: text("sentiment"),
    competitorsMentioned: jsonb("competitors_mentioned")
      .notNull()
      .default(sql`'[]'::jsonb`),
    citations: jsonb("citations").notNull().default(sql`'[]'::jsonb`),
    ourCitationUrl: text("our_citation_url"),
    rawAnswer: text("raw_answer"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    source: text("source").notNull().default("cron"),
  },
  (table) => [
    index("seo_prompt_snapshots_prompt_captured_idx").on(
      table.promptId,
      table.capturedAt,
    ),
    index("seo_prompt_snapshots_engine_captured_idx").on(
      table.engineId,
      table.capturedAt,
    ),
    index("seo_prompt_snapshots_captured_idx").on(table.capturedAt),
  ],
);

export const seoAioPresence = pgTable(
  "seo_aio_presence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    keywordId: uuid("keyword_id")
      .notNull()
      .references(() => seoKeywords.id, { onDelete: "cascade" }),
    capturedAt: bigint("captured_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
    hasAio: boolean("has_aio").notNull().default(false),
    ourCited: boolean("our_cited").notNull().default(false),
    ourCitationUrl: text("our_citation_url"),
    competitors: jsonb("competitors").notNull().default(sql`'[]'::jsonb`),
    source: text("source").notNull().default("dataforseo"),
  },
  (table) => [
    index("seo_aio_presence_keyword_captured_idx").on(
      table.keywordId,
      table.capturedAt,
    ),
  ],
);

export const seoCompetitors = pgTable(
  "seo_competitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    domain: text("domain").notNull(),
    firstSeenAt: bigint("first_seen_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
    mentionCount: integer("mention_count").notNull().default(0),
    isManual: boolean("is_manual").notNull().default(false),
    isExcluded: boolean("is_excluded").notNull().default(false),
  },
  (table) => [
    unique("seo_competitors_domain_unique").on(table.domain),
    index("seo_competitors_mention_count_idx").on(table.mentionCount),
  ],
);

export const seoReferrerAi = pgTable(
  "seo_referrer_ai",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: text("date").notNull(),
    source: text("source").notNull(),
    sessions: integer("sessions").notNull().default(0),
    signups: integer("signups").notNull().default(0),
    fetchedAt: bigint("fetched_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
  },
  (table) => [
    unique("seo_referrer_ai_date_source_unique").on(table.date, table.source),
    index("seo_referrer_ai_date_idx").on(table.date),
  ],
);

export const seoAiBotHits = pgTable(
  "seo_ai_bot_hits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: text("date").notNull(),
    userAgent: text("user_agent").notNull(),
    path: text("path").notNull(),
    hits: integer("hits").notNull().default(1),
    lastSeenAt: bigint("last_seen_at", { mode: "number" })
      .notNull()
      .default(sql`EXTRACT(epoch FROM now())::bigint`),
  },
  (table) => [
    unique("seo_ai_bot_hits_date_ua_path_unique").on(
      table.date,
      table.userAgent,
      table.path,
    ),
    index("seo_ai_bot_hits_date_idx").on(table.date),
  ],
);

export const seoSecrets = pgTable("seo_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  valueCiphertext: text("value_ciphertext").notNull(),
  valueIv: text("value_iv").notNull(),
  valueAuthTag: text("value_auth_tag").notNull(),
  maskedValue: text("masked_value").notNull(),
  lastSetBy: text("last_set_by"),
  lastSetAt: bigint("last_set_at", { mode: "number" })
    .notNull()
    .default(sql`EXTRACT(epoch FROM now())::bigint`),
  lastValidatedAt: bigint("last_validated_at", { mode: "number" }),
  lastValidationStatus: text("last_validation_status"),
  lastValidationError: text("last_validation_error"),
});

export const seoSettings = pgTable("seo_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .default(sql`EXTRACT(epoch FROM now())::bigint`),
  updatedBy: text("updated_by"),
});

// Type exports
export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type NewSeoKeyword = typeof seoKeywords.$inferInsert;
export type SeoKeywordSnapshot = typeof seoKeywordSnapshots.$inferSelect;
export type NewSeoKeywordSnapshot = typeof seoKeywordSnapshots.$inferInsert;
export type SeoGscDaily = typeof seoGscDaily.$inferSelect;
export type NewSeoGscDaily = typeof seoGscDaily.$inferInsert;
export type SeoPage = typeof seoPages.$inferSelect;
export type NewSeoPage = typeof seoPages.$inferInsert;
export type SeoAnnotation = typeof seoAnnotations.$inferSelect;
export type NewSeoAnnotation = typeof seoAnnotations.$inferInsert;
export type SeoEngine = typeof seoEngines.$inferSelect;
export type NewSeoEngine = typeof seoEngines.$inferInsert;
export type SeoPrompt = typeof seoPrompts.$inferSelect;
export type NewSeoPrompt = typeof seoPrompts.$inferInsert;
export type SeoPromptSnapshot = typeof seoPromptSnapshots.$inferSelect;
export type NewSeoPromptSnapshot = typeof seoPromptSnapshots.$inferInsert;
export type SeoAioPresence = typeof seoAioPresence.$inferSelect;
export type NewSeoAioPresence = typeof seoAioPresence.$inferInsert;
export type SeoCompetitor = typeof seoCompetitors.$inferSelect;
export type NewSeoCompetitor = typeof seoCompetitors.$inferInsert;
export type SeoReferrerAi = typeof seoReferrerAi.$inferSelect;
export type NewSeoReferrerAi = typeof seoReferrerAi.$inferInsert;
export type SeoAiBotHit = typeof seoAiBotHits.$inferSelect;
export type NewSeoAiBotHit = typeof seoAiBotHits.$inferInsert;
export type SeoSecret = typeof seoSecrets.$inferSelect;
export type NewSeoSecret = typeof seoSecrets.$inferInsert;
export type SeoSetting = typeof seoSettings.$inferSelect;
export type NewSeoSetting = typeof seoSettings.$inferInsert;
