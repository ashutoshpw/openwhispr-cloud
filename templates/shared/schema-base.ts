/**
 * Base database schema - Application tables used by all auth providers
 *
 * This file contains the core business tables that are provider-agnostic.
 * Auth-specific tables (user, session, account, verification) are defined
 * per-provider in their respective schema-additions.ts files.
 */
import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

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

// Type exports for base tables
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type PricingTierFeature = typeof pricingTierFeatures.$inferSelect;
export type NewPricingTierFeature = typeof pricingTierFeatures.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
