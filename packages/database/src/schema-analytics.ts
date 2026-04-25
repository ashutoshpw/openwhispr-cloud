import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type AnalyticsFunnelStep = {
  label: string;
  path: string;
  matchType: "exact" | "prefix";
};

export const analyticsFunnel = pgTable("analytics_funnel", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  steps: jsonb("steps").$type<AnalyticsFunnelStep[]>().notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type AnalyticsFunnel = typeof analyticsFunnel.$inferSelect;
export type NewAnalyticsFunnel = typeof analyticsFunnel.$inferInsert;
