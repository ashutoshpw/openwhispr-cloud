import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization, project } from "./schema";

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

export const agentInstallation = pgTable(
  "agent_installation",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    displayName: text("display_name"),
    configPublic: jsonb("config_public"),
    status: text("status").notNull().default("active"), // active | disabled
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("agent_installation_unique")
      .on(
        table.organizationId,
        table.projectId,
        table.agentId,
        table.displayName,
      )
      .nullsNotDistinct(),
    index("agent_installation_org_idx").on(table.organizationId),
    index("agent_installation_project_idx").on(table.projectId),
  ],
);

export type AgentInstallation = typeof agentInstallation.$inferSelect;
export type NewAgentInstallation = typeof agentInstallation.$inferInsert;
