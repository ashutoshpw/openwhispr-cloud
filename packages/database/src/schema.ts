import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// BetterAuth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Existing application tables
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  created_time: timestamp("created_time").defaultNow().notNull(),
  payment: varchar("payment", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 255 }).notNull(),
  payment_time: varchar("payment_time", { length: 255 }).notNull(),
  payment_date: varchar("payment_date", { length: 255 }).notNull(),
  receipt_email: varchar("receipt_email", { length: 255 }).notNull(),
  receipt_url: varchar("receipt_url", { length: 500 }).notNull(),
  payment_details: varchar("payment_details", { length: 5000 }).notNull(),
  billing_details: varchar("billing_details", { length: 5000 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  stripeCustomerId: text("stripe_customer_id"),
  status: text("status").notNull().default("active"), // pending | active | readonly | suspended
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("project_org_slug_unique").on(table.organizationId, table.slug),
  ],
);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;

// Billing: Pricing tier features (admin-managed feature sets per Stripe product)
export const pricingTierFeatures = pgTable(
  "pricing_tier_features",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(), // Stripe product ID
    featureKey: text("feature_key").notNull(), // e.g., "max_members", "api_access"
    featureValue: text("feature_value").notNull(), // e.g., "5", "true", "unlimited"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("pricing_tier_feature_unique").on(
      table.productId,
      table.featureKey,
    ),
  ],
);

// Billing: Per-organization feature overrides (not included in tier)
export const orgFeatures = pgTable(
  "org_features",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    featureValue: text("feature_value").notNull(),
    reason: text("reason"), // e.g., "trial", "promotion", "manual_grant"
    grantedBy: text("granted_by"), // User ID who granted this feature
    expiresAt: timestamp("expires_at"), // Optional expiration
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("org_feature_unique").on(
      table.organizationId,
      table.featureKey,
    ),
  ],
);

// Billing: Organization audit logs for billing/subscription changes
export const orgAuditLogs = pgTable("org_audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g., "subscription_created", "plan_upgraded"
  fromValue: text("from_value"), // Previous state
  toValue: text("to_value"), // New state
  metadata: text("metadata"), // JSON string for additional context
  performedBy: text("performed_by").notNull(), // User ID or "system"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// App settings (for configurable values like enterprise contact link)
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Type exports for new tables
export type PricingTierFeature = typeof pricingTierFeatures.$inferSelect;
export type NewPricingTierFeature = typeof pricingTierFeatures.$inferInsert;
export type OrgFeature = typeof orgFeatures.$inferSelect;
export type NewOrgFeature = typeof orgFeatures.$inferInsert;
export type OrgAuditLog = typeof orgAuditLogs.$inferSelect;
export type NewOrgAuditLog = typeof orgAuditLogs.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

// ============================================================================
// Referral System
// ============================================================================

// Referral program configuration (single row for app-wide settings)
export const referralConfig = pgTable("referral_config", {
  id: text("id").primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  referrerCreditAmount: integer("referrer_credit_amount").notNull(), // in cents
  refereeCreditAmount: integer("referee_credit_amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  minPlanTier: text("min_plan_tier").default("tier_1"), // minimum tier to get referral code
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Referral codes - one per eligible user
export const referralCodes = pgTable("referral_codes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull().unique(), // e.g., "REF7X9K2"
  usageCount: integer("usage_count").default(0).notNull(),
  totalCreditsEarned: integer("total_credits_earned").default(0).notNull(), // in cents
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Referrals - tracks each referral relationship and conversion
export const referrals = pgTable(
  "referrals",
  {
    id: text("id").primaryKey(),
    referralCodeId: text("referral_code_id")
      .notNull()
      .references(() => referralCodes.id),
    referrerId: text("referrer_id")
      .notNull()
      .references(() => user.id),
    refereeId: text("referee_id")
      .notNull()
      .references(() => user.id),
    refereeOrganizationId: text("referee_organization_id").references(
      () => organization.id,
    ),
    status: text("status").notNull().default("pending"), // pending | converted | expired | cancelled
    referrerCreditAmount: integer("referrer_credit_amount"), // amount awarded to referrer (cents)
    refereeCreditAmount: integer("referee_credit_amount"), // amount awarded to referee (cents)
    referrerStripeTransactionId: text("referrer_stripe_transaction_id"), // Stripe balance transaction ID
    refereeStripeTransactionId: text("referee_stripe_transaction_id"),
    convertedAt: timestamp("converted_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Each user can only be referred once
    uniqueIndex("referral_referee_unique").on(table.refereeId),
  ],
);

// Type exports for referral tables
export type ReferralConfig = typeof referralConfig.$inferSelect;
export type NewReferralConfig = typeof referralConfig.$inferInsert;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;

// ============================================================================
// OIDC Provider (Better Auth oidcProvider plugin)
// ============================================================================

export const oauthApplication = pgTable("oauth_application", {
  id: text("id").primaryKey(),
  name: text("name"),
  icon: text("icon"),
  metadata: text("metadata"),
  clientId: text("client_id").unique(),
  clientSecret: text("client_secret"),
  redirectURLs: text("redirect_u_r_ls"),
  type: text("type"),
  disabled: boolean("disabled"),
  userId: text("user_id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const oauthAccessToken = pgTable("oauth_access_token", {
  id: text("id").primaryKey(),
  accessToken: text("access_token").unique(),
  refreshToken: text("refresh_token").unique(),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  clientId: text("client_id"),
  userId: text("user_id"),
  scopes: text("scopes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const oauthConsent = pgTable("oauth_consent", {
  id: text("id").primaryKey(),
  clientId: text("client_id"),
  userId: text("user_id"),
  scopes: text("scopes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  consentGiven: boolean("consent_given"),
});

export type OAuthApplication = typeof oauthApplication.$inferSelect;
export type OAuthAccessToken = typeof oauthAccessToken.$inferSelect;
export type OAuthConsent = typeof oauthConsent.$inferSelect;

// ============================================================================
// Integrations (registry + installations)
// ============================================================================

export const integration = pgTable("integration", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'email', 'crm', 'analytics', 'tools', 'other'
  iconUrl: text("icon_url"),
  docsUrl: text("docs_url"),
  status: text("status").notNull().default("active"), // active | beta | deprecated | hidden
  isSystemManaged: boolean("is_system_managed").default(false).notNull(),
  configSchema: jsonb("config_schema"), // JSON Schema for install form
  metadata: jsonb("metadata"), // features, requirements, pricing, hidden, authType, etc
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const integrationInstallation = pgTable(
  "integration_installation",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integration.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    displayName: text("display_name"),
    configEncrypted: text("config_encrypted"),
    configPublic: jsonb("config_public"),
    status: text("status").notNull().default("active"), // active | error | disabled
    lastVerifiedAt: timestamp("last_verified_at"),
    lastError: text("last_error"),
    isSystemManaged: boolean("is_system_managed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("integration_installation_unique")
      .on(
        table.organizationId,
        table.projectId,
        table.integrationId,
        table.displayName,
      )
      .nullsNotDistinct(),
    index("integration_installation_org_idx").on(table.organizationId),
    index("integration_installation_project_idx").on(table.projectId),
  ],
);

export type Integration = typeof integration.$inferSelect;
export type NewIntegration = typeof integration.$inferInsert;
export type IntegrationInstallation =
  typeof integrationInstallation.$inferSelect;
export type NewIntegrationInstallation =
  typeof integrationInstallation.$inferInsert;
