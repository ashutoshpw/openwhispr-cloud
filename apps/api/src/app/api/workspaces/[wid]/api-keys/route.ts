import { createHash, randomBytes } from "node:crypto";
import { withOrg, withOrgAdmin } from "@/lib/org";
import { syncCreated, syncError, syncOk } from "@repo/api-schemas/envelope";
import {
  apiKeyCreateRequest,
  apiKeyWithSecret,
} from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq, isNull } from "@repo/database";
import { apiKey } from "@repo/database/schema";

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** GET /api/workspaces/{wid}/api-keys — admin only. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const rows = await db()
      .select()
      .from(apiKey)
      .where(and(eq(apiKey.organizationId, wid), isNull(apiKey.revokedAt)));
    return syncOk({
      keys: rows.map((k) => ({
        id: k.id,
        name: k.name,
        description: k.description,
        key_prefix: k.keyPrefix,
        kind: k.kind,
        scopes: (k.scopes as string[]) ?? [],
        expires_at: k.expiresAt?.toISOString() ?? null,
        created_at: k.createdAt.toISOString(),
      })),
    });
  });
}

/** POST /api/workspaces/{wid}/api-keys — raw ow_wks_live_ key shown once. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = apiKeyCreateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid key payload");
    const input = parsed.data;

    const raw = `ow_wks_live_${randomBytes(24).toString("base64url")}`;
    const [row] = await db()
      .insert(apiKey)
      .values({
        id: crypto.randomUUID(),
        kind: "workspace",
        userId: user.id,
        organizationId: wid,
        name: input.name,
        description: input.description ?? null,
        keyHash: hash(raw),
        keyPrefix: raw.slice(0, 14),
        scopes: input.scopes,
        expiresInDays: input.expires_in_days ?? null,
        expiresAt: input.expires_in_days
          ? new Date(Date.now() + input.expires_in_days * 86_400_000)
          : null,
        createdByUserId: user.id,
      })
      .returning();

    return syncCreated(
      apiKeyWithSecret.parse({
        id: row.id,
        name: row.name,
        description: row.description,
        key: raw,
        key_prefix: row.keyPrefix,
        kind: row.kind,
        scopes: row.scopes,
        expires_at: row.expiresAt?.toISOString() ?? null,
        created_at: row.createdAt.toISOString(),
      }),
    );
  });
}
