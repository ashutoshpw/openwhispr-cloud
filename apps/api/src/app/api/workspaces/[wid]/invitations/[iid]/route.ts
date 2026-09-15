import { withOrgAdmin } from "@/lib/org";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { workspaceInvitation } from "@repo/database/schema";

/** DELETE /api/workspaces/{wid}/invitations/{iid} — revoke. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ wid: string; iid: string }> },
) {
  const { wid, iid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const [row] = await db()
      .update(workspaceInvitation)
      .set({ status: "revoked" })
      .where(
        and(
          eq(workspaceInvitation.id, iid),
          eq(workspaceInvitation.organizationId, wid),
        ),
      )
      .returning({ id: workspaceInvitation.id });
    if (!row)
      return Response.json(
        { error: { message: "Invitation not found" } },
        { status: 404 },
      );
    return syncOk({ id: row.id, revoked: true });
  });
}

/** POST /api/workspaces/{wid}/invitations/{iid} — resend. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ wid: string; iid: string }> },
) {
  const { wid, iid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const [row] = await db()
      .update(workspaceInvitation)
      .set({ emailSent: Boolean(process.env.RESEND_API_KEY) })
      .where(
        and(
          eq(workspaceInvitation.id, iid),
          eq(workspaceInvitation.organizationId, wid),
        ),
      )
      .returning({
        id: workspaceInvitation.id,
        emailSent: workspaceInvitation.emailSent,
      });
    if (!row)
      return Response.json(
        { error: { message: "Invitation not found" } },
        { status: 404 },
      );
    return syncOk({ id: row.id, email_sent: row.emailSent });
  });
}
