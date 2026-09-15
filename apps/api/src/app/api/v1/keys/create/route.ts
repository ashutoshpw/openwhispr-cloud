import { createHash, randomBytes } from "node:crypto";
import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import {
  apiKeyCreateRequest,
  personalApiKeyCreateResponse,
} from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { apiKey } from "@repo/database/schema";

/** POST /api/v1/keys/create — only place the raw owk_live_ key is returned. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = apiKeyCreateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid key payload");
    const input = parsed.data;

    const raw = `owk_live_${randomBytes(24).toString("base64url")}`;
    const [row] = await db()
      .insert(apiKey)
      .values({
        id: crypto.randomUUID(),
        kind: "personal",
        userId: user.id,
        name: input.name,
        description: input.description ?? null,
        keyHash: createHash("sha256").update(raw).digest("hex"),
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
      personalApiKeyCreateResponse.parse({
        data: {
          id: row.id,
          name: row.name,
          description: row.description,
          key: raw,
          key_prefix: row.keyPrefix,
          kind: row.kind,
          scopes: row.scopes,
          expires_at: row.expiresAt?.toISOString() ?? null,
          created_at: row.createdAt.toISOString(),
        },
      }),
    );
  });
}
