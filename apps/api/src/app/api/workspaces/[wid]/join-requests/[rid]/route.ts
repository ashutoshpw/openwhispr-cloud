import { withOrgAdmin } from "@/lib/org";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { joinRequestDecisionRequest } from "@repo/api-schemas/sync/orgs";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { joinRequest, member } from "@repo/database/schema";

/** PATCH .../join-requests/{rid} { decision: approve|deny } — admin only. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ wid: string; rid: string }> },
) {
  const { wid, rid } = await ctx.params;
  return withOrgAdmin(request, wid, async () => {
    const body = await request.json().catch(() => null);
    const parsed = joinRequestDecisionRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "decision is required");

    const [req] = await db()
      .update(joinRequest)
      .set({
        status: parsed.data.decision === "approve" ? "approved" : "denied",
      })
      .where(and(eq(joinRequest.id, rid), eq(joinRequest.organizationId, wid)))
      .returning();
    if (!req) return syncError(404, "Join request not found");

    if (parsed.data.decision === "approve") {
      await db()
        .insert(member)
        .values({
          id: crypto.randomUUID(),
          organizationId: wid,
          userId: req.userId,
          role: "member",
        })
        .onConflictDoNothing();
    }

    return syncOk({ id: req.id, status: req.status });
  });
}
