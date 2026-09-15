import { withOrg, withOrgAdmin } from "@/lib/org";
import { syncCreated, syncOk } from "@repo/api-schemas/envelope";
import { teamCreateRequest } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { team } from "@repo/database/schema";

/** GET /api/workspaces/{wid}/teams */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrg(request, wid, async () => {
    const rows = await db()
      .select()
      .from(team)
      .where(eq(team.organizationId, wid));
    return syncOk({
      teams: rows.map((t) => ({
        id: t.id,
        organization_id: t.organizationId,
        name: t.name,
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
      })),
    });
  });
}

/** POST /api/workspaces/{wid}/teams { name } — admin only. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const body = await request.json().catch(() => null);
    const parsed = teamCreateRequest.safeParse(body);
    if (!parsed.success)
      return Response.json(
        { error: { message: "name is required" } },
        { status: 400 },
      );

    const [row] = await db()
      .insert(team)
      .values({
        id: crypto.randomUUID(),
        organizationId: wid,
        name: parsed.data.name,
      })
      .returning();
    return syncCreated({
      id: row.id,
      organization_id: row.organizationId,
      name: row.name,
    });
  });
}
