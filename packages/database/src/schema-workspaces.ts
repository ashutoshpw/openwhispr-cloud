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
// OpenWhispr workspace collaboration (teams, spaces, invitations, policy)
// ============================================================================

export const team = pgTable(
  "team",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("team_org_idx").on(table.organizationId)],
);

export const teamMember = pgTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // member | admin
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("team_member_unique").on(table.teamId, table.userId),
    index("team_member_user_idx").on(table.userId),
  ],
);

// Spaces are shared containers of notes/folders inside a workspace.
export const space = pgTable(
  "space",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    emoji: text("emoji"),
    description: text("description"),
    isArchived: boolean("is_archived").default(false).notNull(),
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
    uniqueIndex("space_org_slug_unique").on(table.organizationId, table.slug),
  ],
);

export const spaceMember = pgTable(
  "space_member",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // member | admin
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("space_member_unique").on(table.spaceId, table.userId),
    index("space_member_user_idx").on(table.userId),
  ],
);

export const spaceTeam = pgTable(
  "space_team",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    access: text("access").notNull().default("read"), // read | write
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("space_team_unique").on(table.spaceId, table.teamId)],
);

// ----------------------------------------------------------------------------
// Workspace membership plumbing (desktop join/invite flows)
// ----------------------------------------------------------------------------

// Custom workspace invitations (token-addressed, email-delivered). Distinct
// from better-auth's `invitation` table used by the organization plugin.
export const workspaceInvitation = pgTable(
  "workspace_invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    teamIds: jsonb("team_ids"), // string[] of team ids
    spaceIds: jsonb("space_ids"), // string[] of space ids
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").notNull().default("pending"), // pending | accepted | revoked | expired
    emailSent: boolean("email_sent").default(false).notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_invitation_org_idx").on(table.organizationId),
    index("workspace_invitation_email_idx").on(table.email),
  ],
);

export const joinRequest = pgTable(
  "join_request",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | approved | denied
    decidedByUserId: text("decided_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("join_request_unique").on(table.organizationId, table.userId),
    index("join_request_org_status_idx").on(table.organizationId, table.status),
  ],
);

export type Team = typeof team.$inferSelect;
export type TeamMember = typeof teamMember.$inferSelect;
export type Space = typeof space.$inferSelect;
export type SpaceMember = typeof spaceMember.$inferSelect;
export type SpaceTeam = typeof spaceTeam.$inferSelect;
export type WorkspaceInvitation = typeof workspaceInvitation.$inferSelect;
export type JoinRequest = typeof joinRequest.$inferSelect;
