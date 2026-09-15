# OpenWhispr Cloud: monorepo split into six deployable apps

**Status:** Planned (not started)
**Date:** 2026-09-15
**Repository:** `openwhispr-cloud` (Next.js starter monorepo, baseline `main`)
**Contract source:** desktop app repo (`~/PROJECTS/ashutoshpw/openwhispr`) — every
endpoint, header, and response shape below was extracted from desktop call sites
(`src/services/*`, `src/helpers/cloudApiRequest.js`, `src/lib/auth.ts`,
`src/helpers/ipcHandlers.js`) and the shipped API reference
(`agent-skills/openwhispr-api/SKILL.md`).

## Objective

Convert the single-app starter (`apps/next-app`, one Vercel project) into a
Turborepo that hosts the entire OpenWhispr Cloud surface as six independently
deployed Vercel projects, while keeping the existing GitHub Actions → Vercel
deploy logic (self-hosted runner + `W3Dev/vercel-deploy@main` + Bun) and the
existing shared packages (`@repo/*`) intact:

| App            | Production host          | Responsibility                                                              |
| -------------- | ------------------------ | --------------------------------------------------------------------------- |
| `apps/www`     | `openwhispr.com`         | Marketing site + **user dashboard** + desktop OAuth callback landing         |
| `apps/api`     | `api.openwhispr.com`     | Desktop sync data plane, media/AI plane, public V1 API, webhooks, Inngest    |
| `apps/auth`    | `auth.openwhispr.com`    | Better Auth server, SSO/desktop sign-in shims, one-time-token handoff        |
| `apps/notes`   | `notes.openwhispr.com`   | Public shared-note viewer (`/n/{token}`) + invitation accept landing         |
| `apps/admin`   | `admin.openwhispr.com`   | Enterprise/admin console, entered via one-time-token `/handoff#token=…`      |
| `apps/mcp`     | `mcp.openwhispr.com`     | Stateful-less Streamable HTTP MCP exposing the V1 API as tools               |

Out of scope (unchanged): `docs-public/`, `docs-internal/`, Mintlify validation,
starter-kit SEO/AIEO/agents features (removed from `apps/www`, see §3.1).

---

## 1. The wire contract (source of truth)

### 1.1 Global plumbing (applies to every `api.openwhispr.com` call)

- Desktop base URL: `OPENWHISPR_API_URL || VITE_OPENWHISPR_API_URL` (runtime-env;
  empty default = cloud disabled). Auth base: `VITE_AUTH_URL`, default
  `https://auth.openwhispr.com`. Admin base: `VITE_ADMIN_URL`, default
  `https://admin.openwhispr.com`. MCP display URL:
  `https://mcp.openwhispr.com/mcp`. OAuth callback landing:
  `https://openwhispr.com/auth/desktop-callback`.
- **Auth header:** `Authorization: Bearer <better-auth session token>`. No
  refresh endpoint exists — the auth server rotates the token via the
  `set-auth-token` response header (Better Auth `bearer()` plugin behavior).
- **Policy headers** on every authenticated call:
  `x-openwhispr-policy-version: 1`, `x-openwhispr-version: <appVersion>`,
  `x-openwhispr-source: desktop`.
- **401 semantics:** any 401 → desktop marks the session `AUTH_EXPIRED` and
  re-authenticates; no retry with the same token.
- **Cookie fallback:** legacy desktop paths still present signed cookies
  (`__Secure-openwhispr.session_token` in prod, `openwhispr.session_token` in
  dev) to `GET ${AUTH_URL}/api/auth/get-session`, and one renderer fetch uses
  `credentials: "include"` directly. Consequence: session cookies must be set
  with `Domain=.openwhispr.com`, `SameSite=None; Secure`, and the API host must
  accept cookie sessions in addition to bearer.
- **CORS:** the API host must echo allowed origins
  (`https://openwhispr.com`, `https://notes.openwhispr.com`,
  `https://admin.openwhispr.com`), `Access-Control-Allow-Credentials: true`, and
  allow headers `Authorization, Content-Type, x-openwhispr-policy-version,
  x-openwhispr-version, x-openwhispr-source`. The desktop main process spoofs
  `Origin` to the request's own origin, so preflight must tolerate that too.

### 1.2 Response envelopes (two distinct contracts)

**Sync plane — `/api/*` (desktop + dashboard):** the response body *is* the
resource — no wrapper. Examples: `POST /api/notes/create` → `CloudNote` object;
`GET /api/notes/list` → `{ notes: CloudNote[] }`; `POST /api/notes/batch-create`
→ `{ created: [{ client_note_id, id, updated_at? }] }`. A handful of endpoints
wrap in `{ data: … }` (listed explicitly in §3.2). Desktop also tolerates a
missing bulk endpoint by falling back to per-item calls — never *require* the
fallback, but keep bulk endpoints optional-tolerant.

**Error shape (both planes):**

```json
{ "error": { "message": "…", "code": "optional_code" }, "code": "top_level_code", "data": { "…details" }, "minAppVersion": "x.y.z" }
```

Desktop reads `error.message || error`, top-level `code`, `data` as details, and
`minAppVersion` (either top level or inside `data`). Pinned codes:

| Code                   | HTTP | Emitted by                                    |
| ---------------------- | ---- | --------------------------------------------- |
| `note_version_conflict`| 409  | `PATCH /api/notes/update` on stale `base_updated_at`; details carry `data.note` |
| `LIMIT_REACHED`        | 429  | `POST /api/transcribe`                        |
| `NO_SPEECH_DETECTED`   | 422  | `POST /api/transcribe`                        |
| `POLICY_UNRESOLVABLE`  | any  | `GET /api/workspace-policy`                   |

**Public V1 plane — `/api/v1/*` (CLI, MCP, integrations):** `{ data: … }` for
single resources, `{ data: [...], has_more, next_cursor }` for lists,
`{ error: { code, message } }` for errors, with the exact error-code table and
rate-limit headers from `agent-skills/openwhispr-api/SKILL.md`
(`validation_error`, `invalid_api_key`, `forbidden`, `not_found`,
`method_not_allowed`, `conflict`, `rate_limited`, `internal_error`;
`X-RateLimit-Limit/Remaining/Reset`, `Retry-After` on 429; search costs 5x).

### 1.3 Legacy-compat rules the desktop enforces

- `GET /api/analytics/participation` → 404 is interpreted as "feature not
  rolled out" (`{ configured: false }`). Fine to implement; must not 500.
- `GET /api/notes/{id}/access` → 404 treated as legacy-server compat.
- `DELETE /api/notes/delete-all` → missing endpoint falls back to per-note
  deletes (implement it anyway).
- `GET /api/workspace-policy` → 404/501 = "no org policy" (desktop proceeds
  unmanaged). `POLICY_UNRESOLVABLE` is the only hard error.

---

## 2. Target architecture

```
apps/
  www/      @repo/www      — marketing + dashboard + desktop-callback (Next.js)
  api/      @repo/api      — data + media/AI + v1 planes (Next.js route handlers)
  auth/     @repo/auth-app — Better Auth server + hosted auth UI (Next.js)
  notes/    @repo/notes    — public share viewer (Next.js, mostly RSC)
  admin/    @repo/admin    — enterprise console (Next.js)
  mcp/      @repo/mcp-app  — MCP Streamable HTTP server (Next.js route handler)
packages/
  database/       Neon Postgres + Drizzle — GREENFIELD schema (§4.1)
  auth/           Better Auth server config — + bearer(), cookie domain, OIDC (§4.2)
  api-schemas/    NEW — zod schemas + TS types for every request/response shape (§4.3)
  billing/        Stripe (checkout/portal/sync-engine) — reused as-is
  ai/             AI SDK wrapper — reused for /api/reason + agent stream
  analytics/      PostHog + Vercel Analytics — reused
  object-storage/ @vercel.blob / S3 — reused (note audio, uploads)
  durable-exec/   Inngest — billing sync + analytics rollups (drop SEO/AIEO flows)
  mcp-server/     toolsets — add registerOpenWhisprTools() (§3.6)
  fumadocs/       docs — only if www keeps a /docs route (decision: keep)
```

Dependency direction: `apps/* → packages/*`, never app→app. Cross-app trust is
only via shared DB + shared `@repo/auth` session verification + signed
one-time-tokens (admin handoff).

### 2.1 Monorepo mechanics changes

1. Delete root `vercel.json` (the single-project build filter). Each app gets
   its own `apps/<app>/vercel.json` (§5).
2. `turbo.json`: add the six app names implicitly via workspaces; extend
   `globalEnv` with the new vars (`OPENWHISPR_API_URL` is *not* public — only
   `NEXT_PUBLIC_*` belong there). Per-task `env` for apps that read secrets at
   build time must stay empty where possible (runtime env preferred).
3. Root `package.json` scripts: add
   `dev:www|api|auth|notes|admin|mcp` via `bun run --filter @repo/<app> dev`
   (keep `dev:all`). Keep `check:no-middleware` (each app uses Next 16
   `src/proxy.ts`, never `middleware.ts`), `check:banned-deps`,
   `check-no-per-minute-cron` (any new Vercel cron must be ≥ minutely-exempt,
   i.e. use Inngest instead).
4. `env.example`: add a per-app section (§5.3).
5. Biome/tsconfig: no changes beyond per-app tsconfig `paths` for
   `@repo/api-schemas`.

---

## 3. App-by-app route maps

### 3.1 `apps/www` — `openwhispr.com` (marketing + user dashboard)

**Keep from starter (trim `apps/next-app` → `apps/www`):** landing/pricing,
`/terms`, `/privacy`, `/contact-sales`, blog/changelog (optional), `/docs`
(fumadocs), full `/account/*` dashboard (billing, settings, support),
dashboard workspace management, `/status`, `.well-known/*` as needed.

**Remove from starter:** `adminx/*` (moves to `apps/admin`), `agent/*`,
`claim/*`, `r/[code]`, `mcp` route, `api/*` routes (move to `apps/api`), SEO /
AIEO / agents / referral-* starter-kit demo features except what OpenWhispr
needs (referral **stats display** stays; the API lives in `apps/api`).

**New routes required by the desktop:**

| Route | Purpose |
| ----- | ------- |
| `GET /auth/desktop-callback` | Landing the desktop opens for social/SSO sign-in and calendar OAuth. Reads query params (`protocol=openwhispr`, `gcal_connected`, `gcal_error`, `mcal_*`, `bearer_token` / `token`) and redirects to `openwhispr://auth/callback?…`. Default `VITE_OPENWHISPR_OAUTH_CALLBACK_URL` in desktop. Must work signed-out, no dashboard chrome. |
| `GET /reset-password` | Better Auth `forget-password` `redirectTo` target (`src/lib/auth.ts` desktop). Form posts new password to `https://auth.openwhispr.com/api/auth/reset-password`. |
| `GET /invitations/[token]` | Landing for workspace invitation emails: renders preview via **public** `GET https://api.openwhispr.com/api/invitations/{token}`, then deep-links `openwhispr://invitations/{token}` (desktop handles accept). |

**Dashboard data access:** server components call `@repo/database` directly for
reads when convenient, but all *mutations* must go through `apps/api` route
handlers (same code path as the desktop) so entitlement/policy logic exists
exactly once. Session via `@repo/auth` `getSession` (cookies).

### 3.2 `apps/api` — `api.openwhispr.com`

All routes under `/api`. Grouped by plane. Shapes = §1 plus the field lists
below (exact names; no renames).

**Health & config**

| Endpoint | Method | Contract |
| -------- | ------ | -------- |
| `/api/health` | GET | 200 any JSON; desktop uses 3s-timeout reachability probe. |
| `/api/stt-config` | GET | JSON config for cloud STT (provider routing). |
| `/api/note-recording-config` | GET | JSON config for meeting recording behavior. |

**Auth-adjacent (custom, on the API host)**

| Endpoint | Method | Contract |
| -------- | ------ | -------- |
| `/api/auth/verification-status?email=` | GET | `{ verified: boolean }`. Called by the renderer directly with `credentials: "include"` — CORS + cookies required. Polled every 5s. |
| `/api/auth/delete-account` | DELETE | Destroys account + data (device-erase flow pairs with desktop relaunch). |

**Notes** — body fields (create/update subset): `client_note_id?, workspace_id?,
space_id?, title?, content?, enhanced_content?, enhancement_prompt?, note_type?
("personal"\|"meeting"\|"upload"), source_file?, audio_duration_seconds?,
participants?, calendar_event_id?, diarization_enabled?,
expected_speaker_count?, transcript?, enhanced_at_content_hash?, folder_id?,
created_at?, updated_at?, base_updated_at?`

| Endpoint | Method | Response |
| -------- | ------ | -------- |
| `/api/notes/create` | POST | `CloudNote` (see `src/services/NotesService.ts` for the full field list incl. `user_id`, `created_by_user_id`, `updated_by_user_id`, `access_removed`, `previous_space_id`, `deleted_at`) |
| `/api/notes/batch-create` | POST | `{ created: [{ client_note_id, id, updated_at? }] }` |
| `/api/notes/update` | PATCH | `CloudNote`; 409 `note_version_conflict` + `data.note` on stale `base_updated_at` |
| `/api/notes/delete` | DELETE | `{ id }` body; soft delete (`deleted_at`) |
| `/api/notes/delete-all` | DELETE | `{ deleted: number, errors: number }` |
| `/api/notes/list?limit&before&since&scope=all&before_id&since_id` | GET | `{ notes: CloudNote[] }` — keyset pagination (`before`/`since` timestamps + tiebreaker `before_id`/`since_id`) |
| `/api/notes/search` | POST | `{ notes: (CloudNote & { score })[] }`; body `{ query, limit?, scope?, space_id? }`; `scope:"all"` opts into space results |
| `/api/notes/{cloudId}/share` | GET / PATCH / DELETE | PATCH body `{ visibility, domain_allowlist? }` → `{ share, raw_token }` (raw token shown once; store hash only) |
| `/api/notes/{cloudId}/share/rotate-token` | POST | `{ share, raw_token }` |
| `/api/notes/{cloudId}/share/invitations` | POST | `{ emails: string[] }` → `{ created, already_invited, email_failed_ids }` |
| `/api/notes/{cloudId}/share/invitations/{iid}` | DELETE / POST | remove / resend |
| `/api/notes/{cloudId}/access` | GET | ACL list (404 = legacy compat) |
| `/api/notes/{cloudId}/access/suggestions?q=` | GET | sharee suggestions |
| `/api/notes/{cloudId}/access/grants` | POST | `{ principal_type, principal_id? \| email?, permission }` |
| `/api/notes/{cloudId}/access/grants/{gid}` | PATCH / DELETE | update / revoke |

**Folders:** `POST /api/folders/create`, `POST /api/folders/batch-create
{folders}`, `PATCH /api/folders/update {id,…}`, `DELETE /api/folders/delete
{id}`, `GET /api/folders/list` → `{ folders }`.

**Transcriptions:** create body `{ client_transcription_id?, text, raw_text?,
provider?, model?, language?, audio_duration_ms?, status?, created_at? }`;
`POST /api/transcriptions/create`, `POST /api/transcriptions/batch-create
{transcriptions}`, `GET /api/transcriptions/list?limit&before&since` →
`{ transcriptions }`, `DELETE /api/transcriptions/delete {id}`, `POST
/api/transcriptions/batch-delete {ids}` → `{ deleted }`.

**Dictionary / Snippets** (identical shape, two resources): `POST
/api/{dictionary|snippets}/batch-create {entries…}`, `PATCH
/api/{dictionary|snippets}/update {id,…}`, `DELETE
/api/{dictionary|snippets}/delete {id}`, `GET
/api/{dictionary|snippets}/list?cursor&cursor_id&limit` → `{ entries,
hasMore }` (note: camelCase `hasMore` here, unlike V1's `has_more`).

**Conversations:** `POST /api/conversations/create`
(`{client_conversation_id?, title?, created_at?, updated_at?,
messages?:[{role,content,metadata?}]}`), `PATCH /api/conversations/update
{id, title?, archived_at?}`, `DELETE /api/conversations/delete {id}`, `GET
/api/conversations/list?limit&before&archived&include&since` →
`{ conversations }`, `POST /api/conversations/messages
{conversation_id, role, content, metadata?}` → message, `GET
/api/conversations/messages?conversation_id` → `{ messages }`, `POST
/api/conversations/search {query, limit?}`.

**Workspaces / teams / spaces**

| Endpoint | Method(s) | Notes |
| -------- | --------- | ----- |
| `/api/workspaces` | GET / POST | POST body `{ name }` |
| `/api/workspaces/{wid}` | PATCH / DELETE | |
| `/api/workspaces/{wid}/members` | GET | |
| `/api/workspaces/{wid}/members/{uid}` | PATCH / DELETE | role change / remove |
| `/api/workspaces/{wid}/teams` | GET / POST | |
| `/api/teams/{tid}` | DELETE | |
| `/api/teams/{tid}/members` | GET / POST | POST `{user_id, role}` |
| `/api/teams/{tid}/members/{uid}` | DELETE | |
| `/api/me/spaces` | GET | **wrapped**: `{ data: MySpace[] }` (also used as session-validation probe) |
| `/api/workspaces/{wid}/spaces` | POST | `{ name, emoji?, description?, member_ids, team_ids }` |
| `/api/spaces/{sid}` | PATCH / DELETE | |
| `/api/spaces/{sid}/teams` | POST | `{ team_id, access? }` |
| `/api/spaces/{sid}/teams/{tid}` | DELETE | |
| `/api/spaces/{sid}/members` | GET / POST | POST `{user_id, role}` |
| `/api/spaces/{sid}/members/{uid}` | PATCH / DELETE | DELETE → `{ removed, still_via_teams }` |

**Join flow:** `GET /api/me/joinable`, `POST /api/me/joinable
{workspace_id}`, `POST /api/me/joinable/request {workspace_id}`, `GET
/api/workspaces/{wid}/join-requests`, `PATCH
/api/workspaces/{wid}/join-requests/{rid} {decision:"approve"|"deny"}`.

**Invitations:** `GET/POST /api/workspaces/{wid}/invitations` (POST `{email,
role?, team_ids?, space_ids?}` → adds `email_sent`), `DELETE
/api/workspaces/{wid}/invitations/{iid}`, `POST …/{iid}` (resend);
**public, no auth:** `GET /api/invitations/{token}` (preview), `POST
/api/invitations/{token}/accept` → `{ workspace_id, role, team_ids?,
space_ids? }`.

**API keys:** workspace keys `GET/POST /api/workspaces/{wid}/api-keys`
(`{name, scopes, expires_in_days?, description?}`), `DELETE …/api-keys/{kid}`.
Personal keys (**wrapped** `{data:{…}}`): `GET /api/v1/keys/list` →
`{data:{keys}}`, `POST /api/v1/keys/create {name, scopes, expires_in_days?}` →
`{data:{…key}}` (only place the raw `owk_live_…` is returned), `POST
/api/v1/keys/{id}/revoke`.

**Media / AI / usage plane (main-process calls)**

| Endpoint | Method | Contract |
| -------- | ------ | -------- |
| `/api/transcribe` | POST multipart | Parts: `file` (audio/webm or audio/mpeg) + fields `language, prompt, sendLogs, clientType:"desktop", appVersion, clientVersion, sessionId, clientTranscriptionId, localDate, analyticsOccurredAt` (file upload adds `source:"file_upload"`). ≤4 MB inline; larger audio is pre-chunked by the client (240 s chunks) — each chunk is a normal request. Response `{ text, wordsUsed, wordsRemaining, plan, limitReached, sttProvider, sttModel, sttProcessingMs, sttWordCount, sttLanguage, audioDurationMs }`. Errors: 401 / 429 `LIMIT_REACHED` / 422 `NO_SPEECH_DETECTED` / 503. |
| `/api/streaming-usage` | POST | Post-hoc usage accounting for streaming STT: `{ text, audioDurationSeconds, sessionId, clientType, appVersion, clientVersion, sttProvider?, sttModel?, sttProcessingMs?, sttLanguage?, audioSizeBytes?, audioFormat?, clientTotalMs?, sendLogs?, clientTranscriptionId?, localDate?, analyticsOccurredAt?, analyticsWordCount?, analyticsCounterVersion? }` |
| `/api/usage` | GET | `{ wordsUsed, wordsRemaining, limit, plan, status, isSubscribed, isTrial, trialDaysLeft, currentPeriodEnd, billingInterval, resetAt, entitlementSources: { personal, workspaceIds } }` |
| `/api/reason` | POST | Body `{ text, model, agentName, customDictionary, customPrompt, systemPrompt, requestPurpose, promptMode, purpose, screenContext, language, locale, sessionId, clientType, appVersion, clientVersion, sttProvider, sttModel, sttProcessingMs, sttWordCount, sttLanguage, audioDurationMs, audioSizeBytes, audioFormat, clientTotalMs }` → `{ text, model, provider, promptMode, matchType, screenContextApplied }` |
| `/api/agent/stream` | POST | Body `{ messages, systemPrompt?, tools?, screenContext?, sessionId, clientType, appVersion }` → **NDJSON stream** (one JSON object per line) |
| `/api/agent/web-search` | POST | `{ query, numResults }` → passthrough JSON |
| `/api/streaming-token` | POST | → `{ token }` (AssemblyAI managed) |
| `/api/deepgram-streaming-token` | POST | → `{ token }` |
| `/api/gemini-live-token` | POST | → `{ token }` (single-use, `uses: 1`) |
| `/api/openai-realtime-token` | POST | `{ model, language, streams }` → `{ clientSecret }` or `{ clientSecrets: [...] }` |

Note: the audio websockets go **directly to providers** (Deepgram /
AssemblyAI / Gemini / OpenAI) with these minted tokens — the API never proxies
streaming audio. Token TTLs must match desktop expectations (~60 s mint
window).

**Billing (personal)** — `POST /api/stripe/checkout {plan?:"monthly"|"annual",
tier?:"pro"|"business"}` → `{url}`; `POST /api/stripe/portal` → `{url}`; `POST
/api/stripe/switch-plan {plan, tier}` → `{alreadyOnPlan?}`; `POST
/api/stripe/preview-switch {plan, tier}` → `{immediateAmount, currency,
currentPriceAmount, currentInterval, newPriceAmount, newInterval,
nextBillingDate, alreadyOnPlan?}`.

**Billing (workspace)** — under `/api/workspaces/{wid}/billing/`: `checkout
{interval, tier?, additional_seats?}` → `{data:{url}}`; `portal` → `{url}`;
`preview-seats {additional_seats}` → `{next_quantity, current_quantity,
seats_used, amount_due, currency}`; `preview-upgrade` → `{prorated_amount,
currency, …}`; `upgrade` → `{plan}`; `seats {quantity}` → `{quantity,
seats_used}`.

**Referrals:** `GET /api/referrals/stats`, `POST /api/referrals/invite
{email}`, `GET /api/referrals/invites`.

**Analytics / insights:** `POST /api/analytics/events/batch {events}` →
`{accepted, rejected, supportsHistoricalCounterVersion?}`; `DELETE
/api/analytics/events/delete {eventIds}` or `{deleteAll, clearedThrough}`;
`GET /api/analytics/summary?timeZone&backfill` → `{totalWords,
totalDictations, totalSpokenDurationMs, currentStreakDays, longestStreakDays,
averageWpm, wpmCoveragePercent, daily[≤366]{date, words, dictations,
spokenDurationMs}, historyBackfillRetryRequired?}`; `GET
/api/analytics/participation` (404-tolerant) + `PATCH … {enabled, timeZone?}`;
leaderboard: `GET /api/leaderboard/access` → `{state, scopes[], domain,
colleagueCount, invitation?, joinableWorkspace?}`, `GET
/api/workspaces/{wid}/leaderboard?metric&range&page&weekStart?&includeWeekStarts?`
or `GET /api/leaderboard/domain?…`.

**Org policy & enterprise AI:** `GET /api/workspace-policy` → `{managed,
policy?, policyUpdatedAt?, requiresManagedPolicy?}` (policy gates
`features.screenContextEnabled`; 404/501 = unmanaged); `GET
/api/workspaces/{wid}/enterprise-providers` → `{data: configEnvelope}`; `POST
/api/workspaces/{wid}/enterprise-providers/{provider}/assertion
{inferenceScope?}` → `{data:{assertion}}` (short-lived OIDC token the desktop
exchanges with AWS STS / Azure AD itself).

**Public V1 plane** (`/api/v1/*`, API-key bearer `owk_live_` /
`ow_wks_live_`): implement exactly per `agent-skills/openwhispr-api/SKILL.md`:
`/spaces/list`, `/notes/list`, `/notes/{id}`, `/notes/create`, `/notes/{id}`
(PATCH/DELETE), `/notes/search`, `/folders/list`, `/folders/create`,
`/transcriptions/list`, `/transcriptions/{id}`, `/usage`; envelope `{data}` /
`{data, has_more, next_cursor}`; cursor pagination (base64url composites for
notes, timestamps for transcriptions); plan-based rate limits (Free 30/min &
1k/day, Pro 120/min & 10k/day, Business 300/min & 50k/day; search = 5x) via
Upstash; `space_id` rules (required for workspace keys, rejected for personal).

**Platform:** Stripe webhook receiver (`/api/webhooks/stripe`, from
`@repo/billing`), Inngest endpoint (`/api/inngest`, from `@repo/durable-exec`)
for billing sync + analytics daily rollups; scheduled work uses Inngest, not
per-minute Vercel cron. Rate limiting: Upstash (already a dependency).

### 3.3 `apps/auth` — `auth.openwhispr.com`

Better Auth server (`@repo/auth` config lives here) + minimal hosted UI.

| Surface | Contract |
| ------- | -------- |
| `/api/auth/*` | Full Better Auth mount: `sign-up/email`, `sign-in/email`, `get-session`, `sign-out`, `update-user`, `change-password`, `forget-password`, `list-accounts`, `send-verification-email`, `one-time-token/generate` → `{token}`, SSO plugin routes. `bearer()` plugin ON — every auth response carries `set-auth-token` for token rotation. |
| Cookie | Name prefix `openwhispr` (`__Secure-openwhispr.session_token` in prod), `Domain=.openwhispr.com`, `SameSite=None; Secure` — enables the desktop cookie-fallback `get-session` probe and dashboard sessions on www/admin. |
| `GET /api/desktop-signin/{provider}?callbackURL=…` | google / microsoft / apple: 302 into IdP with state cookies in the *browser* jar; hosted continuation page then 302s to the `callbackURL` (`https://openwhispr.com/auth/desktop-callback?protocol=openwhispr`) appending `bearer_token=…` (or legacy `token=`). |
| `GET /api/desktop-signin/sso?email=…&callbackURL=…` | SSO discovery: resolve the email's org IdP → 302 into it; same continuation mechanics. |
| `/api/auth/one-time-token/generate` | Consumed by desktop for admin handoff: `https://admin.openwhispr.com/handoff#token=<one-time-token>` (single-use, short TTL). |
| Hosted UI | Sign-in / sign-up / 2FA / SSO-continuation pages (browser-only flows). Desktop email+password sign-in happens in-app via the SDK, not these pages. |
| OIDC provider | Starter's `oidcProvider` plugin stays — reserved for enterprise SSO-as-provider scenarios. |

### 3.4 `apps/notes` — `notes.openwhispr.com`

- `GET /n/{raw_token}` — **the** share viewer. URL is built by the desktop from
  the `raw_token` returned by the share endpoints (`/n/{token}`, NOT
  `/share/{id}`). Server-side lookup by token hash; renders note title/content
  (public or domain-allowlisted per `visibility`); no auth; CSP already
  hardened (`default-src 'self'`, `connect-src api.openwhispr.com …`).
- `GET /invitations/[token]` redirect shim → deep link (or render inline; the
  canonical landing lives on www — keep one, redirect the other).
- Everything else 404s. This app must never require session cookies.

### 3.5 `apps/admin` — `admin.openwhispr.com`

- `GET /handoff` — entry point: reads `#token=<one-time-token>`, validates it
  against the auth server (`POST`-style exchange endpoint on the auth host or
  direct DB check of `one_time_tokens`), establishes an admin session, then
  strips the fragment.
- Console sections (trim starter `adminx/*`): users, organizations (=
  workspaces), members, payments/billing, enterprise provider configuration
  (backing `GET/POST /api/workspaces/{wid}/enterprise-providers*`), workspace
  policy editor (backing `GET /api/workspace-policy`), feature flags
  (`app_settings` for `/api/stt-config` and `/api/note-recording-config`),
  API-key oversight, audit log.

### 3.6 `apps/mcp` — `mcp.openwhispr.com`

- `POST|GET|DELETE /mcp` — Streamable HTTP, **stateless** (no sessions).
- Auth: `Authorization: Bearer owk_live_…` / `ow_wks_live_…` (same key store +
  scopes as the V1 plane; same rate-limit windows).
- Tools: one per V1 operation (`notes_list`, `notes_get`, `notes_create`,
  `notes_update`, `notes_delete`, `notes_search`, `folders_list`,
  `folders_create`, `transcriptions_list`, `transcriptions_get`, `usage_get`,
  `spaces_list`) — implemented as thin calls into the same V1 service layer in
  `apps/api`'s shared lib (extract that layer into `packages/` or import from
  a shared `apps/api/src/lib/v1/*` via a workspace package — decision: put the
  V1 service layer in **`packages/api-schemas`' sibling `packages/v1-core`** so
  api + mcp share it without app→app imports).
- Starter wiring to reuse: `mcp-handler`'s `createMcpHandler` +
  `@repo/mcp-server` tool registration pattern.

---

## 4. Shared package changes

### 4.1 `packages/database` — greenfield Drizzle schema (Neon Postgres)

One merged schema (existing pattern). Tables:

- **Auth core** (Better Auth managed): `user`, `session`, `account`,
  `verification`, `two_factor`, `passkey`, plus `one_time_token` (admin
  handoff + device-erase pairing).
- **Orgs**: `workspace` (id, name, slug, …), `workspace_member` (role enum),
  `team`, `team_member`, `join_request` (status, decision),
  `workspace_invitation` (email, role, team_ids, space_ids, token, email_sent),
  `space`, `space_member` (role), `space_team` (access level).
- **Content**: `note` (all `CloudNote` fields; `client_note_id` unique per
  user; `deleted_at` soft delete; `base_updated_at`/`updated_at` for 409
  conflict; `created_by_user_id` nullified on account deletion;
  `access_removed` is *derived*, not stored), `folder` (sort_order, unique
  name per owner/space, ≤50/user), `transcription` (+`client_transcription_id`
  unique per user, `word_count`, `processing_ms`), `dictionary_entry`,
  `snippet`, `conversation`, `conversation_message`.
- **Sharing**: `note_share` (note_id unique, visibility enum
  `public|domain`, domain_allowlist, token_hash, token rotations),
  `note_share_invitation`, `note_access_grant` (principal_type
  `user|team|space|email`, permission).
- **Keys**: `api_key` (kind `personal|workspace`, prefix `owk_live_` /
  `ow_wks_live_`, key_hash, scopes[], expires_at, revoked_at, workspace_id
  nullable).
- **Usage & analytics**: `usage_period` (words used/limit per user+workspace
  entitlement, plan, period bounds, reset_at), `analytics_event` (raw batched
  events, counter_version), `analytics_daily` (rollup feeding
  `/api/analytics/summary`), `leaderboard_participation` (enabled, timeZone),
  leaderboard snapshot tables.
- **Billing**: reuse `@repo/billing` tables (`org_billing`, `payments`,
  `plan_tier`, `pricing_tier_features`, `org_features`) + stripe-sync-engine
  tables. Map `plan` values `free|pro|business`.
- **Enterprise & policy**: `enterprise_provider_config` (workspace_id,
  provider `bedrock|azure`, tenant/role settings, encrypted secrets),
  `workspace_policy` (managed flag, `features` JSON e.g.
  `screenContextEnabled`, policyUpdatedAt), `app_settings` (STT config,
  note-recording config), `onboarding_intent` (use_cases, note,
  spoken_languages).
- **Referrals**: referral codes, invites, stats.

### 4.2 `packages/auth`

- Add `bearer()` plugin (produces `set-auth-token` rotation the desktop
  depends on).
- `advanced.cookiePrefix: "openwhispr"`, default cookie attributes
  `Domain=.openwhispr.com; SameSite=None; Secure` (dev: no Secure prefix).
- `trustedOrigins`: `https://openwhispr.com`, `https://notes.openwhispr.com`,
  `https://admin.openwhispr.com`, `https://api.openwhispr.com` (+ localhost
  dev ports).
- Keep plugins: `organization` (maps to workspaces), `twoFactor`, `passkey`,
  `oidcProvider`, `nextCookies`.
- Export `requireSession(headers)` / `requireApiKey(headers)` helpers used by
  `apps/api`, `apps/www`, `apps/admin` so session verification is defined once.
- New custom endpoints live in `apps/auth` routes (desktop-signin shims,
  one-time-token) using the `auth.api` internally.

### 4.3 `packages/api-schemas` (new)

Zod schemas + inferred TS types + envelope helpers for every §3.2 shape, split
`sync/` vs `v1/`. `apps/api` validates requests with them; `apps/www` and
`apps/notes` reuse types for client calls; `packages/v1-core` consumes them.
This is the anti-drift mechanism — CI can typecheck desktop-shaped fixtures
against these schemas (snapshot fixtures copied from desktop services).

### 4.4 Others

- `packages/billing`: keep; wire checkout/portal/preview logic to both
  personal (`/api/stripe/*`) and workspace (`/api/workspaces/{wid}/billing/*`)
  endpoints; price IDs for `pro|business` × `monthly|annual` in env.
- `packages/durable-exec`: keep Inngest; functions = billing sync, analytics
  daily rollup, share-invitation emails, workspace invitation emails (Resend),
  delete-account data purge. Remove SEO/AIEO flows.
- `packages/object-storage`: store note audio for transcription history
  (`GET /v1/transcriptions/{id}/audio` exists on the CLI bridge path) and
  upload-note source files.
- `packages/fumadocs`: only consumed by `apps/www` `/docs`.

---

## 5. Deployment (unchanged logic, six projects)

### 5.1 Vercel project settings (configure once, in the dashboard)

Six projects already exist under team `team_XlKdoQLCLOaHFIGh0cZ5SJuv`. For
each project set **Root Directory** and domains exactly (the project IDs below
are hardcoded into the deploy workflows, matching the existing convention):

| Vercel project name | Project ID | Root Directory | Production domains |
| ------------------- | ---------- | -------------- | ------------------ |
| `openwhispr-www`    | `prj_p1DeT78RzflBid8YvCHjI5eIJlJc` | `apps/www`     | `openwhispr.com`, `www.openwhispr.com` |
| `openwhispr-api`    | `prj_Fkke6EqdAmQ5FkMVqdCVN9jiOUvC` | `apps/api`     | `api.openwhispr.com` |
| `openwhispr-auth`   | `prj_HhI4HOv3ZR9DGKR65dzKHGvV2vrZ` | `apps/auth`    | `auth.openwhispr.com` |
| `openwhispr-notes`  | `prj_O6paA2AkfjUpmkFjsx6CdQMWTmLy` | `apps/notes`   | `notes.openwhispr.com` |
| `openwhispr-admin`  | `prj_JsmYl8TcnfVUlSMC2uDZGkWczOGd` | `apps/admin`   | `admin.openwhispr.com` |
| `openwhispr-mcp`    | `prj_BURLxASe6bsyxBFEjnn7IXaUsAl5` | `apps/mcp`     | `mcp.openwhispr.com` |

Framework preset: Next.js. All other build settings default (each app carries
its own `apps/<app>/vercel.json`, e.g.:

```json
{ "framework": "nextjs", "installCommand": "bun install" }
```

`bun install` from inside a workspace member walks up to the root lockfile, so
the monorepo installs once and each app builds in its own directory. The old
root `vercel.json` (single `--filter=@repo/next-app` build) is deleted.

### 5.2 GitHub Actions (same deploy logic, matrix)

Keep both workflows exactly as they behave today — self-hosted runner,
`W3Dev/vercel-deploy@main`, `package_manager: bun`, `node_version: '22'`,
`deploy_args: '--archive=tgz'`, the `prebuild_script` git-identity amend,
production-on-push-to-`main` + `workflow_dispatch`, PR previews with WIP skip +
`concurrency` group + `alias_prefix` — and add a matrix:

```yaml
# deploy-vercel.yml (production) — preview workflow mirrors it
jobs:
  deploy:
    runs-on: self-hosted
    strategy:
      fail-fast: false
      matrix:
        include:
          - { app: www,   project_id: prj_p1DeT78RzflBid8YvCHjI5eIJlJc, project_name: openwhispr-www,   alias_prefix: openwhispr-www }
          - { app: api,   project_id: prj_Fkke6EqdAmQ5FkMVqdCVN9jiOUvC, project_name: openwhispr-api,   alias_prefix: openwhispr-api }
          - { app: auth,  project_id: prj_HhI4HOv3ZR9DGKR65dzKHGvV2vrZ, project_name: openwhispr-auth,  alias_prefix: openwhispr-auth }
          - { app: notes, project_id: prj_O6paA2AkfjUpmkFjsx6CdQMWTmLy, project_name: openwhispr-notes, alias_prefix: openwhispr-notes }
          - { app: admin, project_id: prj_JsmYl8TcnfVUlSMC2uDZGkWczOGd, project_name: openwhispr-admin, alias_prefix: openwhispr-admin }
          - { app: mcp,   project_id: prj_BURLxASe6bsyxBFEjnn7IXaUsAl5, project_name: openwhispr-mcp,   alias_prefix: openwhispr-mcp }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Deploy to Vercel
        uses: W3Dev/vercel-deploy@main
        with:
          vercel_token: ${{ secrets.VERCEL_TOKEN }}
          vercel_org_id: 'team_XlKdoQLCLOaHFIGh0cZ5SJuv'
          vercel_project_id: ${{ matrix.project_id }}
          vercel_project_name: ${{ matrix.project_name }}
          package_manager: 'bun'
          node_version: '22'
          deploy_args: '--archive=tgz'
          alias_prefix: ${{ matrix.alias_prefix }}        # preview aliases: pr-<n>--openwhispr-<app>.vercel.app
          environment: ${{ … same production/preview ternary as today … }}
          prebuild_script: |
            git config --global user.email "ashutosh@w3dev.in"
            git config --global user.name "Ashutosh"
            git commit --amend --no-edit --author="Ashutosh <ashutosh@w3dev.in>"
```

- Environment protection rules: `production` / `preview` GitHub environments
  reused as today.
- `deploy-vercel-preview.yml` keeps its path filters
  (`apps/**`, `packages/**`, `package.json`, `bun.lock`, workflow file). Per-app
  path scoping (skip `apps/mcp` when only `apps/www` changed) is a later
  optimization via `dorny/paths-filter`; not part of the parity step.
- Retire the `nexvio-ai` project (prj_YLF5HawHAOzh4oKqS8wmxoBZ9hU5) after
  cutover.

### 5.3 Environment variables per project (set in Vercel, pull with `vc pull`)

Shared: `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`,
`RESEND_API_KEY`, `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`,
`OBJECT_STORAGE_PROVIDER`, PostHog keys.

- **www**: `NEXT_PUBLIC_APP_URL=https://openwhispr.com`,
  `NEXT_PUBLIC_API_URL=https://api.openwhispr.com`,
  `NEXT_PUBLIC_AUTH_URL=https://auth.openwhispr.com`, Stripe publishable key.
- **api**: same three + `BETTER_AUTH_URL`, Stripe price-ID map, provider keys
  for token minting (Deepgram/AssemblyAI/Gemini/OpenAI), web-search provider
  key, `INNGEST_*`, `CRON_SECRET`.
- **auth**: `BETTER_AUTH_URL=https://auth.openwhispr.com`,
  `NEXT_PUBLIC_APP_URL=https://openwhispr.com`, OAuth IdP secrets
  (google/microsoft/apple), `ADMIN_URL=https://admin.openwhispr.com`.
- **notes**: `NEXT_PUBLIC_API_URL=https://api.openwhispr.com`.
- **admin**: session + DB + `NEXT_PUBLIC_AUTH_URL`.
- **mcp**: DB + Upstash + `NEXT_PUBLIC_API_URL` (self-reference for tools).

---

## 6. Build order

1. **Skeleton** — create six app dirs (copy `apps/next-app` → trim per §3),
   per-app `vercel.json` + `package.json` (`@repo/<app>`), delete root
   `vercel.json`, update turbo/env scripts, port `proxy.ts` per app. Build must
   stay green: `bun run build`.
2. **`packages/database`** — greenfield schema (§4.1) + `db:generate`.
3. **`packages/auth`** — bearer/cookie/origins (§4.2) + `packages/api-schemas`.
4. **`apps/auth`** — Better Auth mount, desktop-signin shims, one-time-token,
   hosted UI. Verify with the desktop's cookie-fallback probe and `set-auth-token`.
5. **`apps/api` — sync plane** — notes/folders/transcriptions/dictionary/
   snippets/conversations/workspaces/teams/spaces/join/invitations/keys,
   against §3.2 shapes. Contract-test with fixtures from desktop services.
6. **`apps/api` — media/AI + v1 planes** — transcribe (multipart + 4 MB rule),
   streaming-usage, usage, reason, agent/stream (NDJSON), web-search, token
   minting, stripe, referrals, analytics, policy, enterprise, then `/api/v1/*`
   + rate limits.
7. **`apps/www`** — dashboard + `/auth/desktop-callback` + `/reset-password` +
   `/invitations/[token]`.
8. **`apps/notes`** — `/n/{token}` viewer.
9. **`apps/admin`** — handoff + trimmed console.
10. **`apps/mcp`** — `/mcp` with `packages/v1-core` tools.
11. **Cutover** — set Root Directory + domains on the six existing Vercel
    projects (§5.1), configure per-project env vars (§5.3), DNS/ domains, run
    verification, retire `nexvio-ai`.

---

## 7. Verification checklist

- `bun run build` (typecheck gate) + `bun run lint` + `format:check` green.
- `bun run --filter @repo/billing test` green; add vitest contract suites for
  `packages/api-schemas` fixtures.
- Deploy previews per app alias correctly (`pr-<n>--openwhispr-<app>.vercel.app`).
- Desktop E2E against preview hosts (set `OPENWHISPR_API_URL` / `VITE_AUTH_URL`):
  sign-up → token arrives via `set-auth-token`; notes create/list/search sync;
  409 on stale `base_updated_at`; transcribe ≤/> 4 MB; usage + `LIMIT_REACHED`;
  share → open `notes…/n/{token}` in a private window; workspace invite email →
  deep link accept; admin handoff via one-time token; MCP connect with
  `owk_live_` key; 401-recovery after session expiry.
- CORS: `credentials: "include"` fetch to `/api/auth/verification-status` works
  from www; preflight from all three web origins.

## 8. Risks / open items

- **Cookie fallback + CORS**: the desktop spoofs `Origin` to the API's own
  origin and legacy paths rely on cross-subdomain cookies — the auth cookie
  domain/SameSite settings are load-bearing; test the upgrade-bridge probe
  early (M4).
- **Envelope duality**: sync plane returns bare resources; `me/spaces`,
  `enterprise-providers`, `v1/keys/*` wrap in `{data}`; snippets/dictionary use
  `hasMore` while V1 uses `has_more`. `packages/api-schemas` must encode these
  differences or the desktop will silently mis-parse.
- **Token minting costs**: `/api/*-streaming-token` endpoints proxy paid
  provider token issuance — needs entitlement checks (plan-gated) and tight
  TTLs, matching the desktop's ~60 s mint window.
- **Starter-kit feature removal**: SEO/AIEO/agents removal touches many files
  (routes, `@repo/durable-exec`, adminx) — do it in the skeleton step, not
  gradually, to avoid dead Inngest functions firing in prod.
- **Two `check` scripts to respect**: `check:no-middleware` (use `proxy.ts`)
  and `check-no-per-minute-cron` (use Inngest for schedules).

---

## 9. Phase 2 — documentation & productization debt

Everything below is stale starter-kit content that must be replaced before the
repo is presentable as "OpenWhispr Cloud". Grouped by blast radius.

### 9.1 Root documentation (user-facing)

| File | Debt |
| ---- | ---- |
| `README.md` | Entirely starter marketing ("Next.js 16 Starter Project", badges, "Why use this starter?", single `apps/next-app` structure, starter deploy instructions). Rewrite: what OpenWhispr Cloud is, the six apps + shared packages table, per-app dev ports, deploy overview (6 Vercel projects, GH Actions matrix), link to docs sites and the split plan. |
| `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` | Still describe the single-app layout, "choose your auth provider" wizard, starter scripts, and next-app paths. Rewrite to the six-app architecture, per-app port map, `bun run dev:www|api|…`, the docs policy, and the contract source-of-truth note (`@repo/api-schemas` + desktop repo reference). |
| `env.example` | Single-app var list; starter sections (DEFAULT_TENANT_*, SEO/AIEO, agents). Replace with per-app sections exactly as §5.3, plus shared block. |
| `.cursor/rules/*.mdc` | Six rule files written for the starter's app structure. Rewrite or delete (keep 00-core if genericized). |
| `.setup/templates/**` + `.setup/auth-init/**` | Starter auth-provider selection scaffolding (better-auth/next-auth/clerk/authkit). OpenWhispr hardcodes better-auth — either delete the wizard paths or mark them starter-only. `.setup/auth-init/operations.ts` still patches `apps/next-app` (currently no-ops behind `existsSync` guards). |
| `.agents/skills/*`, `skills-lock.json` | Starter vendored skills — keep, but verify none reference next-app paths in their instructions. |
| `Dockerfile` | Already repointed at `apps/www`; add a header comment noting it builds only the www app (other apps get their own images only if needed). |

### 9.2 Documentation sites (Mintlify)

`docs-public/` and `docs-internal/` describe the starter end-to-end. All
stale pages need rewriting against the new architecture, and `docs.json`
navigation updated:

- **docs-public**: `start/getting-started.mdx`, `operate/run-locally.mdx`
  (still `bun run --filter @repo/next-app dev`; six apps now), `operate/deploy.mdx`
  (single-project story → six-project matrix + Root Directory table),
  `configure/authentication.mdx` (auth provider choice → fixed better-auth
  config: bearer + cross-subdomain cookies), `customize/extend-the-starter.mdx`,
  `customize/project-structure.mdx`, `configure/database.mdx`,
  `integrate/mcp.mdx` (now a dedicated `apps/mcp`), `integrate/agent-auth.mdx`
  (agent-auth removed — repurpose or drop), `start/index.mdx`, `index.mdx`,
  `docs.json` nav.
- **docs-internal**: `architecture/system-overview.mdx` (single-app → six-app
  diagram, shared-DB + cross-app trust model), `architecture/data-and-tenancy.mdx`
  (tenancy removed — rename to data model; document the OpenWhispr schema
  domains), `architecture/auth-and-setup.mdx` (bearer rotation, cookie
  domain/SameSite, trustedOrigins), `architecture/agent-auth.mdx` + `mcp-and-agent-surfaces.mdx`
  (rewritten around apps/mcp + V1 tools), `modules/integrations.mdx` +
  `modules/durable-exec-seo.mdx` (features removed — delete pages + nav
  entries + coverage.json entries), `modules/docs-tooling.mdx` (next-app →
  www), `operations/deployments.mdx` (six projects, Root Directory, env per
  project), `operations/configuration-and-secrets.mdx` (per-project env),
  `testing/findings.mdx` + `testing/agent-auth.mdx` (rewrite),
  `coverage.mdx`/`coverage.json` (align entries with final page set).
- **Gate**: `bun run docs:public:validate`, `docs:internal:validate`,
  `check:doc-coverage` must stay green after the rewrite (update
  `coverage.json` entries alongside page changes).

### 9.3 Product surface (www/admin UI strings & branding)

| Item | Debt |
| ---- | ---- |
| `apps/www/src/components/LandingPage/*` | Starter hero/marketing copy (`HeroSection.tsx` et al.) — replace with OpenWhispr Cloud product content (marketing pages, pricing tiers matching Stripe `free/pro/business`, terms/privacy links). |
| `apps/www/src/components/NavBar.tsx` | Starter nav links/brand. |
| `apps/www/src/lib/site-config.ts` | `DEFAULT_PRODUCTION_URL` still `nextjs-starter-kit-app.vercel.app` → `https://openwhispr.com`. |
| `apps/admin/src/app/adminx/(components)/AdminTopNav.tsx` + titles | Check for starter branding ("Nextjs Starter Kit" was in DashboardTopNav — already fixed there; sweep admin). |
| `apps/www` metadata | Root layout title/description already "OpenWhispr" (M1); sweep remaining pages (`blog`, `docs` landing) for starter titles. |
| `apps/www/public/` | 836 KB of starter screenshots/logos (better-auth.png, stripe.png, dash.jpg…) — replace with OpenWhispr assets or trim. |
| `apps/www/src/app/blog`, `changelog` | Starter sample MDX posts (`content/blog/sample-post-*`) — replace or hide route. |
| `packages/auth/src/server.ts` passkey | `rpName` already "OpenWhispr" (done in M2). |

### 9.4 Repo metadata

- GitHub repo description/website fields (currently starter-era).
- `package.json` root `"name": "nextjs-starter-monorepo"` →
  `"openwhispr-cloud"`; `LICENSE` still "SEE LICENSE IN LICENSE" — confirm
  license choice for a private product repo.
- `fallow.yml` / `codeql.yml` — verify configs still make sense.
- Branch protection / ruleset on `main` currently blocks on secret scanning
  unblocks — keep, but note the `backup/pre-secret-purge` local branch and
  remote starter-era branches (`billing-portal`, `copilot/*`) still contain
  the leaked-secret history; delete after key rotation.

### 9.5 Sequencing

Doc debt splits naturally: (a) **root docs + env.example + branding sweep**
belong with M7 (www is the last UI-bearing app — brand it once, document
once); (b) **docs sites rewrite** belongs with M11 cutover when the
architecture story is final; (c) **repo metadata** can happen anytime.
`check:doc-coverage`, `docs:*:validate`, `check:root-md`, `check:doc-paths`
gate all doc changes — run them per change.
