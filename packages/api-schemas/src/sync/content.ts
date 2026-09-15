import { z } from "zod";

/**
 * Transcriptions, dictionary, snippets, and conversations — field names
 * mirror the desktop services (TranscriptionsService.ts,
 * DictionaryService.ts, SnippetService.ts, ConversationsService.ts).
 */

// ---------------------------------------------------------------------------
// Transcriptions
// ---------------------------------------------------------------------------

export const transcriptionInput = z.object({
  client_transcription_id: z.string().nullish(),
  text: z.string(),
  raw_text: z.string().nullish(),
  provider: z.string().nullish(),
  model: z.string().nullish(),
  language: z.string().nullish(),
  audio_duration_ms: z.number().nullish(),
  status: z.string().nullish(),
  created_at: z.string().optional(),
});

export const cloudTranscription = z.object({
  id: z.string(),
  client_transcription_id: z.string().nullable(),
  text: z.string(),
  raw_text: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  language: z.string().nullable(),
  audio_duration_ms: z.number().nullable(),
  processing_ms: z.number().nullish(),
  word_count: z.number().nullish(),
  status: z.string(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CloudTranscription = z.infer<typeof cloudTranscription>;

export const transcriptionBatchCreateRequest = z.object({
  transcriptions: z.array(transcriptionInput),
});
export const transcriptionBatchDeleteRequest = z.object({
  ids: z.array(z.string()),
});
export const transcriptionBatchDeleteResponse = z.object({
  deleted: z.number(),
});
export const transcriptionsListResponse = z.object({
  transcriptions: z.array(cloudTranscription),
});

// ---------------------------------------------------------------------------
// Dictionary & snippets (identical list shape: { entries, hasMore })
// ---------------------------------------------------------------------------

export const dictionaryEntryInput = z.object({
  client_entry_id: z.string().nullish(),
  word: z.string().min(1),
  replacement: z.string().nullish(),
});

export const cloudDictionaryEntry = z.object({
  id: z.string(),
  client_entry_id: z.string().nullable(),
  word: z.string(),
  replacement: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const snippetInput = z.object({
  client_snippet_id: z.string().nullish(),
  trigger: z.string().min(1),
  content: z.string().min(1),
});

export const cloudSnippet = z.object({
  id: z.string(),
  client_snippet_id: z.string().nullable(),
  trigger: z.string(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const entryListResponse = z.object({
  entries: z.array(z.unknown()),
  hasMore: z.boolean(),
});

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const conversationMessageInput = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  metadata: z.record(z.unknown()).nullish(),
});

export const conversationInput = z.object({
  client_conversation_id: z.string().nullish(),
  title: z.string().nullish(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  messages: z.array(conversationMessageInput).nullish(),
});

export const conversationUpdateRequest = z.object({
  id: z.string(),
  title: z.string().nullish(),
  archived_at: z.string().nullish(),
});

export const cloudConversationMessage = z.object({
  id: z.string(),
  conversation_id: z.string(),
  role: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
});

export type CloudConversationMessage = z.infer<typeof cloudConversationMessage>;

export const cloudConversation = z.object({
  id: z.string(),
  client_conversation_id: z.string().nullable(),
  title: z.string().nullable(),
  archived_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  messages: z.array(cloudConversationMessage).nullish(),
});

export type CloudConversation = z.infer<typeof cloudConversation>;

export const conversationsListResponse = z.object({
  conversations: z.array(cloudConversation),
});
export const conversationMessagesRequest = z.object({
  conversation_id: z.string(),
});
export const conversationMessagesResponse = z.object({
  messages: z.array(cloudConversationMessage),
});
export const conversationMessageCreateRequest = z.object({
  conversation_id: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  metadata: z.record(z.unknown()).nullish(),
});
export const conversationSearchRequest = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
});
export const conversationSearchResponse = z.object({
  conversations: z.array(cloudConversation),
});
