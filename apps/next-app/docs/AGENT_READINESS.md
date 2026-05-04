# Agent Readiness Implementation

This starter template publishes the basic discovery artifacts that external AI agents and agent-readiness scanners expect.

## Routes

- `/sitemap.xml`: generated from public marketing, docs, and blog pages only
- `/robots.txt`: includes the sitemap reference and `Content-Signal`
- `/.well-known/api-catalog`: curated API catalog for agent-facing surfaces
- `/.well-known/openid-configuration`: root OIDC discovery wrapper
- `/.well-known/oauth-authorization-server`: OAuth authorization server metadata
- `/.well-known/oauth-protected-resource`: metadata for the protected MCP resource
- `/.well-known/mcp/server-card.json`: MCP server card for `/mcp`
- `/.well-known/agent-skills/index.json`: agent skills discovery index
- `/.well-known/agent-skills/:skill`: per-skill markdown document
- `/status`: lightweight public readiness endpoint

## Canonical URL Configuration

The implementation uses a shared base URL helper. In production, set one of:

- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

If neither is present, Vercel deployment URLs are used. This same base URL is reused for:

- sitemap URLs
- metadata base/canonical links
- OIDC/OAuth discovery
- API catalog links
- MCP server card URLs

## Markdown Negotiation

Public content pages support markdown responses when the request includes:

```http
Accept: text/markdown
```

The middleware rewrites eligible public routes to an internal markdown route while preserving the original URL externally. HTML remains the default for browsers.

## Catalog Curation

The API catalog is intentionally curated. It advertises agent-facing surfaces only:

- the authenticated MCP endpoint
- auth discovery metadata
- service docs
- status/readiness

It does not enumerate admin, billing, or workspace-internal REST routes by default.

## WebMCP

`WebMcpBootstrap` registers a minimal set of public browser tools when `navigator.modelContext.provideContext()` is available. Keep this list small and stable.

## Local Verification

Run from the repo root:

```bash
bun run --filter @repo/next-app build
```

Then check:

```bash
curl -I http://localhost:8801/
curl http://localhost:8801/robots.txt
curl http://localhost:8801/sitemap.xml
curl http://localhost:8801/.well-known/api-catalog
curl -H 'Accept: text/markdown' http://localhost:8801/
```
