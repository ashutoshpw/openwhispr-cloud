import { z } from "zod";

/**
 * Workspaces, teams, spaces, membership, invitations, and API keys — mirrors
 * WorkspacesService.ts / TeamsService.ts / SpacesService.ts /
 * InvitationsService.ts / WorkspaceApiKeysService.ts / ApiKeysService.ts.
 */

// ---------------------------------------------------------------------------
// Workspaces & members
// ---------------------------------------------------------------------------

export const workspace = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CloudWorkspace = z.infer<typeof workspace>;

export const workspaceMember = z.object({
  id: z.string(),
  user_id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string(),
  created_at: z.string(),
});

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export const teamCreateRequest = z.object({
  name: z.string().min(1).max(100),
});
export const teamMemberAddRequest = z.object({
  user_id: z.string(),
  role: z.string().default("member"),
});
export const team = z.object({
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const teamsListResponse = z.object({ teams: z.array(team) });

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

export const mySpace = z.object({
  id: z.string(),
  workspace_id: z.string(),
  workspace_name: z.string().nullish(),
  name: z.string(),
  slug: z.string().nullish(),
  emoji: z.string().nullish(),
  description: z.string().nullish(),
  role: z.string().nullish(),
  access: z.string().nullish(),
  note_count: z.number().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});

export type MySpace = z.infer<typeof mySpace>;

/** GET /api/me/spaces wraps in { data } — the only list endpoint that does. */
export const mySpacesResponse = z.object({ data: z.array(mySpace) });

export const spaceCreateRequest = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().nullish(),
  description: z.string().nullish(),
  member_ids: z.array(z.string()).default([]),
  team_ids: z.array(z.string()).default([]),
});
export const spaceTeamAddRequest = z.object({
  team_id: z.string(),
  access: z.enum(["read", "write"]).default("read"),
});
export const spaceMemberAddRequest = z.object({
  user_id: z.string(),
  role: z.enum(["member", "admin"]).default("member"),
});
export const spaceMemberRoleUpdateRequest = z.object({
  role: z.enum(["member", "admin"]),
});
export const spaceMemberRemoveResponse = z.object({
  removed: z.boolean(),
  still_via_teams: z.boolean(),
});
export const space = z.object({
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  slug: z.string(),
  emoji: z.string().nullable(),
  description: z.string().nullable(),
  is_archived: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ---------------------------------------------------------------------------
// Join flow
// ---------------------------------------------------------------------------

export const joinableWorkspace = z.object({
  workspace_id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  member_count: z.number().nullish(),
  requires_request: z.boolean().nullish(),
});
export const joinableListResponse = z.object({
  workspaces: z.array(joinableWorkspace),
});
export const joinRequestCreateRequest = z.object({ workspace_id: z.string() });
export const joinRequestDecisionRequest = z.object({
  decision: z.enum(["approve", "deny"]),
});
export const joinRequest = z.object({
  id: z.string(),
  workspace_id: z.string(),
  user_id: z.string(),
  user_name: z.string().nullish(),
  user_email: z.string().nullish(),
  status: z.string(),
  created_at: z.string(),
});
export const joinRequestsListResponse = z.object({
  requests: z.array(joinRequest),
});

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export const invitationCreateRequest = z.object({
  email: z.string().email(),
  role: z.string().default("member"),
  team_ids: z.array(z.string()).nullish(),
  space_ids: z.array(z.string()).nullish(),
});
export const cloudInvitation = z.object({
  id: z.string(),
  workspace_id: z.string(),
  email: z.string(),
  role: z.string(),
  team_ids: z.array(z.string()).nullable(),
  space_ids: z.array(z.string()).nullable(),
  status: z.string(),
  email_sent: z.boolean().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const invitationsListResponse = z.object({
  invitations: z.array(cloudInvitation),
});
/** Public preview — no auth. */
export const invitationPreview = cloudInvitation.pick({
  workspace_id: true,
  email: true,
  role: true,
  team_ids: true,
  space_ids: true,
});
export const invitationAcceptResponse = z.object({
  workspace_id: z.string(),
  role: z.string(),
  team_ids: z.array(z.string()).nullish(),
  space_ids: z.array(z.string()).nullish(),
});

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export const apiKeyScopes = z.array(z.string());
export const apiKeyCreateRequest = z.object({
  name: z.string().min(1).max(100),
  scopes: apiKeyScopes,
  expires_in_days: z.number().int().min(1).max(3650).optional(),
  description: z.string().max(500).optional(),
});
/** Only place the raw key material is ever returned. */
export const apiKeyWithSecret = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  key_prefix: z.string(),
  kind: z.enum(["personal", "workspace"]),
  scopes: apiKeyScopes,
  expires_at: z.string().nullable(),
  created_at: z.string(),
});
export const apiKeyView = apiKeyWithSecret.omit({ key: true });
export const apiKeysListResponse = z.object({ keys: z.array(apiKeyView) });
/** Desktop personal-keys plane wraps in { data } (ApiKeysService.ts). */
export const personalApiKeysResponse = z.object({
  data: z.object({ keys: z.array(apiKeyView) }),
});
export const personalApiKeyCreateResponse = z.object({
  data: apiKeyWithSecret,
});
