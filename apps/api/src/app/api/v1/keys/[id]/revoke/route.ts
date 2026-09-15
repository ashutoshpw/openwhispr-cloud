import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { apiKey } from "@repo/database/schema";

/** POST /api/v1/keys/{id}/revoke — personal key revocation. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return withSession(request, async (user) => {
    const [row] = await db()
      .update(apiKey)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKey.id, id), eq(apiKey.userId, user.id)))
      .returning({ id: apiKey.id });
    if (!row)
      return Response.json(
        { error: { message: "Key not found" } },
        { status: 404 },
      );
    return syncOk({ id: row.id, revoked: true });
  });
}
