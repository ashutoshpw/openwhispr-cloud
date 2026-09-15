import { withOrgAdmin } from "@/lib/org";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { apiKey } from "@repo/database/schema";

/** DELETE /api/workspaces/{wid}/api-keys/{kid} — revoke. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ wid: string; kid: string }> },
) {
  const { wid, kid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const [row] = await db()
      .update(apiKey)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKey.id, kid), eq(apiKey.organizationId, wid)))
      .returning({ id: apiKey.id });
    if (!row)
      return Response.json(
        { error: { message: "Key not found" } },
        { status: 404 },
      );
    return syncOk({ id: row.id, revoked: true });
  });
}
