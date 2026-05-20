import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tenant = pgTable("tenant", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  platformName: text("platform_name").notNull(),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  supportEmail: text("support_email"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const tenantDomain = pgTable(
  "tenant_domain",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    domain: text("domain").notNull().unique(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("tenant_domain_tenant_id_idx").on(table.tenantId)],
);

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
export type TenantDomain = typeof tenantDomain.$inferSelect;
export type NewTenantDomain = typeof tenantDomain.$inferInsert;
