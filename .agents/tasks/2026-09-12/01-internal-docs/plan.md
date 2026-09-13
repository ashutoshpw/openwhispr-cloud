# Internal and public documentation coverage plan

**Status:** Implemented locally; validation complete; hosting/access-control review pending
**Date:** 2026-09-12
**Repository:** `nextjs16-starter-kit`
**Baseline:** local `main` at `d6fc034`

## Implementation status

The implementation is present in the current worktree. Root Mintlify sites
(`docs-public/` and `docs-internal/`) are now the hand-maintained sources, and
the in-app Fumadocs `/docs` route consumes the public tree as a generated
mirror. The coverage manifest, source-path/link checks, pre-commit enforcement,
public/internal architecture and module pages, agent-auth contract/security
pages, operations runbooks, and verification guidance have been added. Legacy
workspace documentation trees were removed after their useful content was
rewritten into the canonical sites.

Current validation results:

- `bun run docs:public:validate` — passed.
- `bun run docs:internal:validate` — passed.
- `bun run check:doc-paths` — passed.
- `bun run check:doc-coverage` — passed (29 entries across both sites).
- `bun run check:root-md` — passed.
- `bun run lint` and `bun run format:check` — passed.
- `bun run --filter @repo/billing test` — passed (29 tests).
- `bun run build` — passed; static generation logs expected missing
  `DATABASE_URL`/Stripe-credential warnings in this unconfigured checkout.

Remaining before publication or delivery: record the public/internal hosting
URLs and access policy, run authenticated protocol smoke checks against a
disposable configuration, and resolve the local branch's ahead/behind state
through the normal merge/rebase decision. No commit or push is part of this
implementation step.

## Objective

Make the repository documentation complete enough for maintainers, agents, and
starter-kit users to understand where code lives, how the major modules work,
how to configure and operate them, and how to verify changes. Keep private
implementation and operator material separate from public, task-oriented
guidance, and keep documentation references aligned with the source tree.

This plan does not require documenting every function or duplicating code
comments. Each maintainable subsystem should have an intentional coverage
decision: a focused internal page, a public integration page, a source-level
comment/API contract, or an explicit reason it does not need standalone docs.

## Baseline findings

- The local checkout has five legacy internal-doc pages under
  `apps/next-app/docs/` and two Fumadocs content pages under
  `packages/fumadocs/content/docs/`; it has no root `docs-internal/` or
  `docs-public/` tree.
- `origin/main` is a divergent line (`main` is six commits ahead and five
  behind) and contains commit `1c86edb` that proposes separate root Mintlify
  sites. Use that commit as a migration reference, not as a blind cherry-pick:
  local `d6fc034` contains additional agent-auth work and other source changes.
- Existing internal pages cover only agent readiness, PostHog, ChatGPT/MCP
  integration, and testing. They do not cover the auth, billing, database,
  durable-exec/SEO, object-storage, AI, MCP packages, setup machinery, admin,
  tenancy, or integration modules.
- The current branch adds an undocumented agent-auth surface: `auth.md`,
  anonymous/service-auth/identity-assertion registration, claim ceremonies,
  OAuth token and revocation endpoints, Security Event Token notification,
  JWKS, trust-provider resolution, signing/replay/rate-limit/audit helpers, and
  `schema-agent-auth.ts`.
- Several legacy/remote docs contain stale source references (for example the
  old `apps/next-app/src/lib/analytics/` location, missing hooks/middleware
  paths, and `next.config.js` instead of `next.config.mjs`). Every migrated page
  must be checked against the current source, not copied verbatim.
- `AGENTS.md`, `CLAUDE.md`, and the README contain overlapping setup and docs
  guidance, including stale structure/version claims. They need a consistency
  pass after the canonical docs location is chosen.

## Documentation boundary

Use the following ownership rules throughout implementation:

| Material | Canonical location | Notes |
| --- | --- | --- |
| Starter-user setup, configuration, extension, deployment, and troubleshooting | `docs-public/` | Organize by the user's task, not by internal component names. |
| Internal architecture, module contracts, data flows, migrations, operations, security, and verification | `docs-internal/` | Keep implementation details and maintainer runbooks private. |
| Machine-readable agent protocol | `/auth.md` route, generated from code | Add public consumer guidance plus internal implementation/security notes; do not maintain a second hand-written protocol source. |
| Repository behavior rules and agent constraints | `AGENTS.md`, `CLAUDE.md` | These remain the source of truth and should link to deeper pages. |
| Executable agent workflows and reusable playbooks | `.agents/skills/`, `.claude/skills/` | Link from internal docs; do not copy the full instructions into Mintlify pages. |
| Function-level rationale and local API contracts | Source comments/JSDoc and exported types | Add docs pages only when the behavior crosses module or operator boundaries. |

Before publishing an internal site, confirm its hosting/access control. Do not
put secrets, private keys, live tokens, or sensitive production values in either
site.

## Implementation phases

### Phase 0 — Resolve the documentation baseline

1. Confirm the target branch/commit for implementation and preserve the local
   commits through a normal merge or rebase decision; do not reset the branch or
   cherry-pick `1c86edb` without resolving its source/config differences.
2. Decide whether root Mintlify sites are the canonical publisher. The
   recommended direction is to adopt the split introduced by `1c86edb`:
   `docs-public/` and `docs-internal/`, with the old in-app Fumadocs tree
   removed or explicitly made a generated mirror.
3. Record the public and internal site URLs/access policy, who owns updates,
   and whether internal docs are allowed to be deployed publicly.
4. Capture a source inventory at the chosen baseline: packages, app route
   groups, setup templates/scripts, database schemas/DALs, exported APIs,
   environment variables, external integrations, and verification commands.

**Exit criteria:** canonical publisher and access boundary are recorded; the
implementation branch is known; no existing user changes are overwritten.

### Phase 1 — Establish one docs tree and enforce its paths

1. Create `docs-public/` and `docs-internal/` Mintlify configuration/navigation
   files and landing pages. Port useful content from the legacy Fumadocs and
   `apps/next-app/docs` pages, but rewrite it against the current branch.
2. Add root scripts for preview and broken-link validation for both sites.
3. Add staged-path enforcement so new generic `docs/` or nested workspace docs
   paths are rejected, while the documented root markdown exemptions and agent
   skill directories remain valid.
4. Choose one source for public docs. If Mintlify is canonical, remove the
   legacy `apps/next-app/docs` and `packages/fumadocs/content/docs` sources and
   update the app's Fumadocs/source, navigation, sitemap, markdown negotiation,
   link-header, LLM-index, and MCP catalog references accordingly. If an
   in-app `/docs` route is retained, make it a generated/mirrored surface with
   an explicit freshness rule rather than a second hand-maintained tree.
5. Update `README.md`, `AGENTS.md`, and `CLAUDE.md` to describe the final
   layout, preview/validation commands, and public/private boundary. Remove
   stale version, port, path, and provider claims while preserving the concise
   entry-point role of the README.

**Exit criteria:** both docs sites build from their declared roots; there is no
ambiguous hand-maintained docs location; path-policy checks pass.

### Phase 2 — Add a coverage manifest and page template

1. Add a small internal coverage manifest (JSON/MDX table is sufficient) that
   maps each package and major app surface to its owning page, source paths,
   visibility (`public`, `internal`, or `source-only`), and verification command.
2. Use a consistent page structure:
   - purpose and audience;
   - source map with exact repository paths;
   - runtime/data flow and module boundaries;
   - configuration and environment variables (names only, never values);
   - failure modes and operational cautions;
   - local/CI verification steps;
   - change checklist and last-verified source revision.
3. Add a lightweight checker for documented repository paths and links. It
   should fail on clearly invalid local paths without attempting to interpret
   ordinary prose or external URLs. Keep exceptions explicit and reviewable.
4. Decide which generated or low-level UI files are intentionally covered by a
   domain page rather than receiving one page per file.

**Exit criteria:** every package root and major route/domain has a coverage
entry; missing coverage is visible rather than inferred from directory shape.

### Proposed information architecture

Use stable domain pages instead of one page per source file. The exact slugs can
change during implementation, but the initial target should be recognizable:

```text
docs-public/
├── docs.json
├── start/{index,getting-started}.mdx
├── configure/{authentication,database}.mdx
├── customize/{project-structure,extend-the-starter}.mdx
├── integrate/{agent-auth,mcp}.mdx
└── operate/{run-locally,deploy,troubleshoot}.mdx

docs-internal/
├── docs.json
├── index.mdx
├── architecture/{system-overview,auth-and-setup,data-and-tenancy,
│                 agent-auth,mcp-and-agent-surfaces}.mdx
├── modules/{analytics,billing,database,durable-exec-seo,ai-and-storage,
│            integrations,docs-tooling}.mdx
├── operations/{configuration-and-secrets,deployments,migrations,
│              observability-and-recovery}.mdx
└── testing/{verification-matrix,agent-auth,findings}.mdx
```

The public `agent-auth`/`mcp` pages describe contracts external consumers need;
the internal pages describe implementation, security invariants, and operator
procedures. The two audiences should link to one another only where the
internal site access policy permits it.

### Phase 3 — Document the core architecture and packages

Create internal pages (combine closely related items where it keeps the site
usable) for:

- **System overview:** Next.js App Router, Turborepo/Bun workspaces, app-to-
  package dependency direction, server/client boundaries, `proxy.ts`, and the
  request/data flow.
- **Authentication and setup:** `@repo/auth`, the one-time `.setup/` lifecycle,
  Better Auth/NextAuth/AuthKit/Clerk templates, generated-file ownership,
  session/organization/passkey/2FA behavior, and safe provider switching.
- **Database and tenancy:** `@repo/database`, schema modules, Drizzle client,
  DAL boundaries, tenant resolution/whitelabel behavior, migration versus
  push rules, seeds, and production migration checks.
- **Billing:** `@repo/billing`, Stripe checkout/customer/portal/sync paths,
  subscriptions, pricing plans, feature limits, read-only states, referrals,
  audit events, and Inngest billing jobs.
- **Analytics:** `@repo/analytics`, client/server entry points, PostHog and
  Vercel analytics, event contracts, admin queries, workflow scripts, and
  privacy/credential boundaries. Update old `apps/next-app/src/lib/analytics`
  references to the package location.
- **Durable execution and SEO/AIEO:** `@repo/durable-exec`, event/function
  registration, retry/idempotency expectations, AIEO engines, GSC/DataForSEO,
  encrypted secrets/settings, cron replacement, and operator recovery.
- **MCP and AI packages:** `@repo/mcp-chatgpt`, `@repo/mcp-server`, `@repo/ai`,
  tool metadata/registration, request context and logging, widget/admin tool
  boundaries, provider configuration, and `/mcp` authentication.
- **Object storage and integrations:** `@repo/object-storage`, provider
  selection, S3/Vercel Blob behavior, encryption, integration installation and
  proxy/runtime paths, and relevant API routes.
- **Docs/tooling:** the chosen Mintlify/Fumadocs arrangement, generated source
  files, navigation ownership, preview/validation commands, and how to avoid
  duplicate docs.

**Exit criteria:** a maintainer can trace each shared package from its entry
point to its consumers, configuration, persistence, and verification path.

### Phase 4 — Document the new agent-auth protocol and agent surfaces

1. Add a public consumer page for agent registration and credential use. Cover
   discovery, `anonymous`, `service_auth`, and `identity_assertion` methods;
   claim-code UX; OAuth grant parameters; scopes; polling states; access-token
   use; revocation; and expected error responses. Keep the route-generated
   `/auth.md` manifest as the protocol source of truth.
2. Add an internal implementation/security page covering:
   - route ownership for `/auth.md`, `/agent/identity*`, `/oauth2/*`, and
     `/agent/event/notify`;
   - ID-JAG verification, issuer/audience/auth-time checks, trusted-provider
     JWKS resolution and cache behavior;
   - signing-key storage/rotation, assertion and access-token TTLs;
   - claim-token/user-code hashing, expiry, replay protection, polling limits,
     rate limiting, and audit events;
   - registration/token/delegation/replay/audit schema tables and lifecycle;
   - scope transitions before/after claim, token revocation, SET handling, and
     anti-enumeration behavior;
   - tenant assumptions and the threat model for anonymous and linked claims.
3. Document the public discovery surfaces and their relationship: OIDC/OAuth
   metadata, protected-resource metadata, JWKS, MCP server card, API catalog,
   agent-skills index, `/llms.txt`, and markdown negotiation.
4. Add a protocol test matrix for happy paths, malformed input, expired/replayed
   credentials, wrong issuer/audience, rate limits, claim polling, revocation,
   and provider-key failures. Never place test secrets or production tokens in
   docs.

**Exit criteria:** an external agent can follow the public contract, while a
maintainer can safely change the implementation without guessing its security
or persistence invariants.

### Phase 5 — Complete operations, testing, and public guidance

1. Add internal runbooks for environment configuration, secrets, local versus
   production deployment, Vercel/Docker, database migrations, Inngest, Stripe,
   PostHog, object storage, and incident/recovery checks.
2. Replace the historical testing-findings page with a clearly dated record:
   separate resolved findings from current blockers, link each finding to the
   source/test evidence, and avoid presenting an old snapshot as current
   behavior.
3. Add internal verification pages for package tests, build/lint/format gates,
   route smoke checks, agent-auth scenarios, and docs validation.
4. Keep `docs-public/` focused on user tasks: getting started, setup/provider
   selection, database, project structure, extending the starter, local run,
   deployment, troubleshooting, and—if supported externally—agent/MCP
   integration. Do not expose internal admin routes, private architecture,
   trust lists, or operational secrets.
5. Update all links in email templates, README examples, agent discovery,
   API-catalog service-doc links, and navigation to the canonical public docs
   destination.

**Exit criteria:** public users have a coherent setup path; maintainers have
operator and verification runbooks; historical findings are not mistaken for
live guarantees.

### Phase 6 — Validate and deliver in reviewable slices

Recommended dependency-ordered delivery:

1. **Docs foundation:** root trees, navigation, publisher scripts, path policy,
   and legacy-source decision.
2. **Architecture/package coverage:** manifest plus core package pages.
3. **Agent-auth:** public protocol, internal security/data-flow page, discovery
   surface docs, and protocol test matrix.
4. **Operations/public polish:** runbooks, testing guidance, public task pages,
   stale-link/source-reference cleanup.
5. **Validation gate:** CI/pre-commit checks, final source-reference audit,
   screenshots/links for both docs sites, and release notes.

Do not merge a page that cites a path, command, port, environment variable, or
route that was not verified at the implementation baseline.

## Validation checklist

Run after each content slice and again before delivery:

```bash
bun run docs:public:validate
bun run docs:internal:validate
bun run check:doc-paths
bun run check:root-md
bun run lint
bun run format:check
bun run build
```

Run focused checks where applicable:

- `bun run --filter @repo/billing test`;
- verify `/auth.md` is markdown and its advertised URLs/scopes match the
  discovery routes;
- smoke-test OAuth/OIDC metadata, JWKS, API catalog, MCP server card,
  agent-skills index, `/status`, and `/mcp` with the documented auth state;
- exercise anonymous registration, service-auth claim, identity-assertion
  linking, token exchange, polling, revocation, SET notification, replay, and
  rate-limit cases against a disposable database/configuration;
- check every source path in the coverage manifest against the same commit;
- confirm the internal site access control and that no secrets appear in the
  rendered pages, generated artifacts, logs, or screenshots.

## Non-goals and safeguards

- Do not add a page for every UI component or trivial helper.
- Do not put private credentials, key material, user data, or production-only
  values in docs.
- Do not change application behavior merely to make a documentation example
  pass; either correct the example or document the actual behavior.
- Do not delete the legacy docs tree until all useful content is migrated and
  links/builds have been verified.
- Keep this plan under `.agents/tasks/`; it is a planning artifact, not part of
  the public or internal documentation sites.

## Definition of done

- `docs-public/` and `docs-internal/` are the only hand-maintained site trees,
  with an explicit, enforced boundary.
- All shared packages, setup machinery, major app domains, agent surfaces, and
  operator workflows have coverage entries and source-verified pages or an
  explicit source-only decision.
- The new agent-auth implementation is documented at both consumer and
  maintainer/security levels.
- Legacy docs and root guidance no longer contain stale paths, versions,
  commands, ports, or contradictory ownership rules.
- Docs link/path checks, package/app quality gates, protocol smoke tests, and
  site access-control review pass on the chosen implementation baseline.
