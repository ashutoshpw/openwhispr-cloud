import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";
import { personalApiKeysResponse } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq, isNull } from "@repo/database";
import { apiKey } from "@repo/database/schema";

/**
 * GET /api/v1/keys/list — desktop personal keys; wraps in { data } per
 * ApiKeysService.ts.
 */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const rows = await db()
      .select()
      .from(apiKey)
      .where(
        and(
          eq(apiKey.userId, user.id),
          eq(apiKey.kind, "personal"),
          isNull(apiKey.revokedAt),
        ),
      );

    return syncOk(
      personalApiKeysResponse.parse({
        data: {
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
        },
      }),
    );
  });
}
