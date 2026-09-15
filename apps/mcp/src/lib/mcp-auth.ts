import { createHash } from "node:crypto";
import { and, eq, gt, isNull, or } from "@repo/database";
import { db } from "@repo/database";
import { apiKey } from "@repo/database/schema";

/**
 * API-key auth for the MCP server.
 *
 * Mirrors the lookup the v1 plane uses: keys are stored as the sha256 hex of
 * the raw value; the raw key is only ever seen in the Authorization header.
 * `owk_live_` = personal key, `ow_wks_live_` = workspace key.
 */

export const KEY_PREFIXES = ["owk_live_", "ow_wks_live_"] as const;

export interface McpKeyContext {
  keyId: string;
  kind: string; // "personal" | "workspace"
  userId: string;
  organizationId: string | null;
  scopes: string[];
}

export type McpScope = "notes:read" | "notes:write" | "usage:read";

export function extractBearerKey(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const raw = match?.[1]?.trim();
  if (!raw) return null;
  if (!KEY_PREFIXES.some((prefix) => raw.startsWith(prefix))) return null;
  return raw;
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Resolve + validate the key on the request, or null when unauthorized. */
export async function resolveApiKey(
  request: Request,
): Promise<McpKeyContext | null> {
  const raw = extractBearerKey(request);
  if (!raw) return null;

  const [row] = await db()
    .select()
    .from(apiKey)
    .where(
      and(
        eq(apiKey.keyHash, hashApiKey(raw)),
        isNull(apiKey.revokedAt),
        or(isNull(apiKey.expiresAt), gt(apiKey.expiresAt, new Date())),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    keyId: row.id,
    kind: row.kind,
    userId: row.userId,
    organizationId: row.organizationId,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
  };
}

/**
 * Scope enforcement. Personal keys carry notes:read / notes:write /
 * usage:read directly. Workspace keys gate through workspace:* (or the
 * narrower workspace:read / workspace:write).
 */
export function hasScope(ctx: McpKeyContext, required: McpScope): boolean {
  const section = required.split(":")[1]; // "read" | "write"
  if (ctx.kind === "workspace") {
    return (
      ctx.scopes.includes("workspace:*") ||
      ctx.scopes.includes(`workspace:${section}`)
    );
  }
  return ctx.scopes.includes(required) || ctx.scopes.includes("*");
}
