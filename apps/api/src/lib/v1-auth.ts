import { createHash } from "node:crypto";
import { v1Error } from "@repo/api-schemas/envelope";
import type { V1Plan } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, desc, eq, gt, isNull, or } from "@repo/database";
import { apiKey, usagePeriod } from "@repo/database/schema";
import { enforceV1RateLimit } from "./rate-limit";

/**
 * Authentication + authorization for the public V1 plane
 * (agent-skills/openwhispr-api/SKILL.md). Keys are looked up by sha256 hash;
 * every route wraps its handler in withV1Key which runs
 * requireApiKey → rate limit → scope check.
 */

export type V1KeyKind = "personal" | "workspace";

export type V1Auth = {
  key: typeof apiKey.$inferSelect;
  userId: string;
  organizationId: string | null;
  scopes: string[];
  kind: V1KeyKind;
  plan: V1Plan;
};

/** Scopes that grant team-space discovery (GET /spaces/list). */
export const WORKSPACE_CONTENT_SCOPES = [
  "workspace:notes:read",
  "workspace:notes:write",
  "workspace:folders:read",
  "workspace:folders:write",
  "workspace:transcriptions:read",
] as const;

export type V1RouteScopes = {
  /** Scope(s) required for personal keys. */
  personal?: string | readonly string[];
  /** Scope(s) required for workspace keys (defaults to personal). */
  workspace?: string | readonly string[];
  /** Reject workspace keys entirely (transcriptions, usage). */
  personalOnly?: boolean;
  /** Reject personal keys entirely (spaces/list). */
  workspaceOnly?: boolean;
};

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function planFromValue(value: string): V1Plan {
  return value === "pro" || value === "business" ? value : "free";
}

/** Plan comes from the owner's latest active usage_period row (default free). */
async function ownerPlan(userId: string): Promise<V1Plan> {
  const [row] = await db()
    .select({ plan: usagePeriod.plan })
    .from(usagePeriod)
    .where(
      and(
        eq(usagePeriod.userId, userId),
        gt(usagePeriod.periodEnd, new Date()),
      ),
    )
    .orderBy(desc(usagePeriod.periodEnd))
    .limit(1);
  return row ? planFromValue(row.plan) : "free";
}

export async function requireApiKey(request: Request): Promise<V1Auth | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw.startsWith("owk_live_") && !raw.startsWith("ow_wks_live_"))
    return null;

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
    key: row,
    userId: row.userId,
    organizationId: row.organizationId,
    scopes: (row.scopes as string[]) ?? [],
    kind: row.kind === "workspace" ? "workspace" : "personal",
    plan: await ownerPlan(row.userId),
  };
}

export function hasScope(scopes: string[], needed: string): boolean {
  if (scopes.includes(needed)) return true;
  return needed.startsWith("workspace:") && scopes.includes("workspace:*");
}

export function hasAnyScope(
  scopes: string[],
  needed: string | readonly string[],
): boolean {
  const list = Array.isArray(needed) ? needed : [needed];
  return list.some((scope) => hasScope(scopes, scope));
}

function attachHeaders(
  response: Response,
  headers: Record<string, string>,
): Response {
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return response;
}

export function withV1Key(
  request: Request,
  scopes: V1RouteScopes,
  handler: (auth: V1Auth) => Promise<Response>,
  costMultiplier = 1,
): Promise<Response> {
  return (async () => {
    const auth = await requireApiKey(request);
    if (!auth) {
      return v1Error(
        401,
        "invalid_api_key",
        "Missing, malformed, expired, or revoked key",
      );
    }

    const limited = await enforceV1RateLimit(
      auth.plan,
      auth.key.id,
      costMultiplier,
    );
    if (!limited.ok) return limited.response;

    if (auth.kind === "workspace" && scopes.personalOnly) {
      return attachHeaders(
        v1Error(
          403,
          "forbidden",
          "This endpoint does not accept workspace keys",
        ),
        limited.headers,
      );
    }
    if (auth.kind === "personal" && scopes.workspaceOnly) {
      return attachHeaders(
        v1Error(403, "forbidden", "This endpoint requires a workspace key"),
        limited.headers,
      );
    }

    const needed =
      auth.kind === "workspace"
        ? (scopes.workspace ?? scopes.personal)
        : scopes.personal;
    if (needed && !hasAnyScope(auth.scopes, needed)) {
      const label = Array.isArray(needed) ? needed.join(" or ") : needed;
      return attachHeaders(
        v1Error(403, "forbidden", `Missing required scope: ${label}`),
        limited.headers,
      );
    }

    try {
      return attachHeaders(await handler(auth), limited.headers);
    } catch (error) {
      console.error("[v1] handler failed", error);
      return attachHeaders(
        v1Error(500, "internal_error", "Internal server error"),
        limited.headers,
      );
    }
  })();
}
