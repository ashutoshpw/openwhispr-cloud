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
import { space, team } from "./schema-workspaces";

// ============================================================================
// OpenWhispr notes & content
// ============================================================================

export const note = pgTable(
  "note",
  {
    id: text("id").primaryKey(),
    // Client-generated id for idempotent create/batch-create (unique per owner).
    clientNoteId: text("client_note_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Custodian: the workspace the note lives in (null = personal).
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    spaceId: text("space_id").references(() => space.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    content: text("content").notNull(),
    enhancedContent: text("enhanced_content"),
    enhancementPrompt: text("enhancement_prompt"),
    noteType: text("note_type").notNull().default("personal"), // personal | meeting | upload
    sourceFile: text("source_file"),
    audioDurationSeconds: integer("audio_duration_seconds"),
    participants: text("participants"),
    calendarEventId: text("calendar_event_id"),
    diarizationEnabled: integer("diarization_enabled"),
    expectedSpeakerCount: integer("expected_speaker_count"),
    transcript: text("transcript"),
    enhancedAtContentHash: text("enhanced_at_content_hash"),
    folderId: text("folder_id"),
    deletedAt: timestamp("deleted_at"),
    // Attribution: creator (null after account deletion) vs last editor.
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("note_client_id_unique").on(table.userId, table.clientNoteId),
    index("note_user_updated_idx").on(table.userId, table.updatedAt),
    index("note_space_updated_idx").on(table.spaceId, table.updatedAt),
    index("note_folder_idx").on(table.folderId),
  ],
);

export const folder = pgTable(
  "folder",
  {
    id: text("id").primaryKey(),
    clientFolderId: text("client_folder_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    spaceId: text("space_id").references(() => space.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("folder_client_id_unique").on(
      table.userId,
      table.clientFolderId,
    ),
    uniqueIndex("folder_user_name_unique").on(table.userId, table.name),
    index("folder_user_sort_idx").on(table.userId, table.sortOrder),
  ],
);

export const transcription = pgTable(
  "transcription",
  {
    id: text("id").primaryKey(),
    clientTranscriptionId: text("client_transcription_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    rawText: text("raw_text"),
    provider: text("provider"),
    model: text("model"),
    language: text("language"),
    audioDurationMs: integer("audio_duration_ms"),
    processingMs: integer("processing_ms"),
    wordCount: integer("word_count"),
    status: text("status").notNull().default("completed"),
    source: text("source"), // e.g. "desktop" | "file_upload"
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("transcription_client_id_unique").on(
      table.userId,
      table.clientTranscriptionId,
    ),
    index("transcription_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const dictionaryEntry = pgTable(
  "dictionary_entry",
  {
    id: text("id").primaryKey(),
    clientEntryId: text("client_entry_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The word/phrase itself and optional replacement/hint, matching the
    // desktop dictionary model.
    word: text("word").notNull(),
    replacement: text("replacement"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("dictionary_client_id_unique").on(
      table.userId,
      table.clientEntryId,
    ),
    index("dictionary_user_idx").on(table.userId),
  ],
);

export const snippet = pgTable(
  "snippet",
  {
    id: text("id").primaryKey(),
    clientEntryId: text("client_entry_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trigger: text("trigger").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("snippet_client_id_unique").on(
      table.userId,
      table.clientEntryId,
    ),
    index("snippet_user_idx").on(table.userId),
  ],
);

export const conversation = pgTable(
  "conversation",
  {
    id: text("id").primaryKey(),
    clientConversationId: text("client_conversation_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("conversation_client_id_unique").on(
      table.userId,
      table.clientConversationId,
    ),
    index("conversation_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const conversationMessage = pgTable(
  "conversation_message",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | system | tool
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("conversation_message_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

// ----------------------------------------------------------------------------
// Sharing & access control
// ----------------------------------------------------------------------------

export const noteShare = pgTable(
  "note_share",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => note.id, { onDelete: "cascade" }),
    // public | domain
    visibility: text("visibility").notNull().default("public"),
    domainAllowlist: text("domain_allowlist"), // comma-separated domains for "domain"
    // sha256 of the raw token; the raw value is shown exactly once.
    tokenHash: text("token_hash").notNull().unique(),
    tokenPrefix: text("token_prefix").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("note_share_note_unique").on(table.noteId)],
);

export const noteShareInvitation = pgTable(
  "note_share_invitation",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => note.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"), // pending | accepted | failed
    emailSent: boolean("email_sent").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("note_share_invitation_unique").on(table.noteId, table.email),
  ],
);

export const noteAccessGrant = pgTable(
  "note_access_grant",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => note.id, { onDelete: "cascade" }),
    // user | team | space | email
    principalType: text("principal_type").notNull(),
    principalUserId: text("principal_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    principalTeamId: text("principal_team_id").references(() => team.id, {
      onDelete: "cascade",
    }),
    principalSpaceId: text("principal_space_id").references(() => space.id, {
      onDelete: "cascade",
    }),
    principalEmail: text("principal_email"),
    // read | comment | edit
    permission: text("permission").notNull().default("read"),
    grantedByUserId: text("granted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("note_access_grant_note_idx").on(table.noteId)],
);

export type Note = typeof note.$inferSelect;
export type NewNote = typeof note.$inferInsert;
export type Folder = typeof folder.$inferSelect;
export type Transcription = typeof transcription.$inferSelect;
export type DictionaryEntry = typeof dictionaryEntry.$inferSelect;
export type Snippet = typeof snippet.$inferSelect;
export type Conversation = typeof conversation.$inferSelect;
export type ConversationMessage = typeof conversationMessage.$inferSelect;
export type NoteShare = typeof noteShare.$inferSelect;
export type NoteShareInvitation = typeof noteShareInvitation.$inferSelect;
export type NoteAccessGrant = typeof noteAccessGrant.$inferSelect;
