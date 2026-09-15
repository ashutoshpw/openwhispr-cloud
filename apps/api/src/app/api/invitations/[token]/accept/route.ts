import { createHash } from "node:crypto";
import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { invitationAcceptResponse } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import {
  member,
  organization,
  workspaceInvitation,
} from "@repo/database/schema";

/** POST /api/invitations/{token}/accept — authenticated accept → membership. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  return withSession(request, async (user) => {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const [row] = await db()
      .update(workspaceInvitation)
      .set({ status: "accepted" })
      .where(
        and(
          eq(workspaceInvitation.tokenHash, tokenHash),
          eq(workspaceInvitation.status, "pending"),
        ),
      )
      .returning();
    if (!row) return syncError(404, "Invitation not found or no longer valid");

    await db()
      .insert(member)
      .values({
        id: crypto.randomUUID(),
        organizationId: row.organizationId,
        userId: user.id,
        role: row.role,
      })
      .onConflictDoNothing();

    return syncOk(
      invitationAcceptResponse.parse({
        workspace_id: row.organizationId,
        role: row.role,
        team_ids: (row.teamIds as string[] | null) ?? [],
        space_ids: (row.spaceIds as string[] | null) ?? [],
      }),
    );
  });
}
