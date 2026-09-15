import { createHash } from "node:crypto";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { invitationPreview } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { organization, workspaceInvitation } from "@repo/database/schema";

/**
 * GET /api/invitations/{token} — public preview (no auth; the desktop calls
 * this with cloudGetPublic). Token-addressed; safe to expose.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const [row] = await db()
    .select({
      id: workspaceInvitation.id,
      organizationId: workspaceInvitation.organizationId,
      email: workspaceInvitation.email,
      role: workspaceInvitation.role,
      teamIds: workspaceInvitation.teamIds,
      spaceIds: workspaceInvitation.spaceIds,
      status: workspaceInvitation.status,
    })
    .from(workspaceInvitation)
    .innerJoin(
      organization,
      eq(organization.id, workspaceInvitation.organizationId),
    )
    .where(
      and(
        eq(workspaceInvitation.tokenHash, tokenHash),
        eq(workspaceInvitation.status, "pending"),
      ),
    )
    .limit(1);

  if (!row) return syncError(404, "Invitation not found or no longer valid");

  const [org] = await db()
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, row.organizationId))
    .limit(1);

  return syncOk(
    invitationPreview.parse({
      workspace_id: row.organizationId,
      email: row.email,
      role: row.role,
      team_ids: (row.teamIds as string[] | null) ?? [],
      space_ids: (row.spaceIds as string[] | null) ?? [],
    }),
  );
}
