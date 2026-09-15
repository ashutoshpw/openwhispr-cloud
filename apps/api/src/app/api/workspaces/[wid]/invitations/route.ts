import { createHash } from "node:crypto";
import { randomBytes } from "node:crypto";
import { withOrg, withOrgAdmin } from "@/lib/org";
import { syncCreated, syncError, syncOk } from "@repo/api-schemas/envelope";
import {
  cloudInvitation,
  invitationCreateRequest,
} from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { workspaceInvitation } from "@repo/database/schema";

/** GET /api/workspaces/{wid}/invitations — admin only. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const rows = await db()
      .select()
      .from(workspaceInvitation)
      .where(eq(workspaceInvitation.organizationId, wid));
    return syncOk({
      invitations: rows.map((r) => ({
        id: r.id,
        workspace_id: r.organizationId,
        email: r.email,
        role: r.role,
        team_ids: (r.teamIds as string[] | null) ?? [],
        space_ids: (r.spaceIds as string[] | null) ?? [],
        status: r.status,
        email_sent: r.emailSent,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      })),
    });
  });
}

/**
 * POST /api/workspaces/{wid}/invitations { email, role?, team_ids?, space_ids? }
 * → invitation + email_sent; the raw token is emailed, only its hash stored.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = invitationCreateRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid invitation payload");

    const rawToken = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const emailSent = Boolean(process.env.RESEND_API_KEY);

    const [row] = await db()
      .insert(workspaceInvitation)
      .values({
        id: crypto.randomUUID(),
        organizationId: wid,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        teamIds: parsed.data.team_ids ?? null,
        spaceIds: parsed.data.space_ids ?? null,
        tokenHash,
        emailSent,
        invitedByUserId: user.id,
      })
      .returning();

    return syncCreated(
      cloudInvitation.parse({
        id: row.id,
        workspace_id: row.organizationId,
        email: row.email,
        role: row.role,
        team_ids: (row.teamIds as string[] | null) ?? [],
        space_ids: (row.spaceIds as string[] | null) ?? [],
        status: row.status,
        email_sent: row.emailSent,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      }),
    );
  });
}
