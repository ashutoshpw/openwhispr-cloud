import { canDowngradeToFree, getUsageSummary } from "@/lib/billing";
import type { BillingUsageResponse } from "@/lib/billing";
import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { member } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/billing/usage?orgId=xxx
 * Get usage statistics for an organization
 *
 * Returns:
 * - usage: Current usage summary (members, projects with limits and percentages)
 * - canDowngradeToFree: Whether the workspace can downgrade to free tier
 * - downgradeBlockers: List of blockers preventing downgrade
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    // Verify user is a member of the organization
    const membership = await db()
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, orgId),
        ),
      )
      .limit(1);

    if (!membership[0]) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 },
      );
    }

    // Get usage information in parallel
    const [usage, downgradeCheck] = await Promise.all([
      getUsageSummary(orgId),
      canDowngradeToFree(orgId),
    ]);

    const response: BillingUsageResponse = {
      usage,
      canDowngradeToFree: downgradeCheck.canDowngrade,
      downgradeBlockers: downgradeCheck.blockers,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage information" },
      { status: 500 },
    );
  }
}
