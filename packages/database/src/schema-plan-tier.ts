import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const planTier = pgTable("plan_tier", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., "free", "tier1", "tier2"
  displayName: text("display_name").notNull(), // e.g., "Free", "Pro", "Business"
  description: text("description"),
  isPaid: boolean("is_paid").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),

  // Pricing page display fields (M3)
  stripeProductId: text("stripe_product_id"), // logical FK to stripe.products.id
  monthlyPriceId: text("monthly_price_id"), // Stripe price ID
  yearlyPriceId: text("yearly_price_id"), // Stripe price ID
  monthlyDisplayPrice: text("monthly_display_price"), // e.g., "$24/month"
  yearlyDisplayPrice: text("yearly_display_price"), // e.g., "$240/year"
  costLabel: text("cost_label"), // e.g., "per user/month"
  features: jsonb("features").$type<string[]>().default([]).notNull(),
  isPopular: boolean("is_popular").default(false).notNull(),
  isExclusive: boolean("is_exclusive").default(false).notNull(), // contact-pricing tier
  actionLabel: text("action_label"), // "Get Started" / "Contact Sales"
  hideFromPricing: boolean("hide_from_pricing").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type PlanTier = typeof planTier.$inferSelect;
export type NewPlanTier = typeof planTier.$inferInsert;
