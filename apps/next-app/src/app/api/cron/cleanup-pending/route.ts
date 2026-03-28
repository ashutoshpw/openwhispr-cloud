import { ORG_STATUS, PENDING_WORKSPACE_TTL_HOURS } from "@repo/billing";
import { db, sql } from "@repo/database";
import { and, eq, lt } from "@repo/database";
import { member, organization, project } from "@repo/database/schema";
import { NextResponse } from "next/server";

// Vercel Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/cleanup-pending
 * Cron job that runs hourly to clean up pending organizations
 * Deletes organizations that have been pending for more than TTL hours
 *
 * This endpoint is secured by CRON_SECRET header
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting pending organization cleanup...");

    // Calculate cutoff time (default 24 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - PENDING_WORKSPACE_TTL_HOURS);

    // Find pending organizations older than TTL
    const pendingOrgs = await db()
      .select()
      .from(organization)
      .where(
        and(
          eq(organization.status, ORG_STATUS.PENDING),
          lt(organization.createdAt, cutoffTime),
        ),
      );

    console.log(
      `[Cron] Found ${pendingOrgs.length} pending organizations to clean up`,
    );

    let deletedCount = 0;

    for (const org of pendingOrgs) {
      try {
        // Delete organization (cascade will handle members and projects)
        await db().delete(organization).where(eq(organization.id, org.id));
        deletedCount++;
        console.log(
          `[Cron] Deleted pending workspace: ${org.id} (${org.name})`,
        );
      } catch (deleteError) {
        console.error(
          `[Cron] Failed to delete workspace ${org.id}:`,
          deleteError,
        );
      }
    }

    console.log(
      `[Cron] Cleanup complete. ${deletedCount} pending workspaces deleted.`,
    );

    return NextResponse.json({
      success: true,
      found: pendingOrgs.length,
      deleted: deletedCount,
      cutoffTime: cutoffTime.toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Pending organization cleanup failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
