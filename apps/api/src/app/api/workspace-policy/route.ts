import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { eq, inArray } from "@repo/database";
import { member, workspacePolicy } from "@repo/database/schema";

/**
 * GET /api/workspace-policy → { managed, policy?, policyUpdatedAt?,
 * requiresManagedPolicy? }. Unmanaged users get { managed: false } (the
 * desktop treats 404/501 the same way).
 */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const memberships = await db()
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, user.id));
    if (memberships.length === 0) {
      return syncOk({ managed: false });
    }

    const [policy] = await db()
      .select()
      .from(workspacePolicy)
      .where(
        inArray(
          workspacePolicy.organizationId,
          memberships.map((m) => m.organizationId),
        ),
      )
      .limit(1);

    if (!policy || !policy.managed) return syncOk({ managed: false });

    return syncOk({
      managed: true,
      policy: (policy.features as Record<string, unknown> | null) ?? {},
      policyUpdatedAt: policy.updatedAt.toISOString(),
      requiresManagedPolicy: false,
    });
  });
}
