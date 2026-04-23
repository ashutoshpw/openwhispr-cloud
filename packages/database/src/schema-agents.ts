import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Agents (registry of AI agents manageable from admin)
export const agent = pgTable("agent", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'outreach', 'research', 'support', 'other'
  iconUrl: text("icon_url"),
  docsUrl: text("docs_url"),
  status: text("status").notNull().default("active"), // active | beta | deprecated | hidden
  isSystemManaged: boolean("is_system_managed").default(false).notNull(),
  systemPrompt: text("system_prompt"),
  model: text("model"), // overrides OPENAI_DEFAULT_MODEL when set
  temperature: numeric("temperature"),
  configSchema: jsonb("config_schema"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Agent = typeof agent.$inferSelect;
export type NewAgent = typeof agent.$inferInsert;
