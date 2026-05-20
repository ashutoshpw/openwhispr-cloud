import { db } from "@repo/database";
import { and, eq, lt } from "@repo/database";
import { organization } from "@repo/database/schema";
import { ORG_STATUS, PENDING_WORKSPACE_TTL_HOURS } from "../constants";

export interface PendingCleanupResult {
  found: number;
  deleted: number;
  cutoffTime: string;
}

/**
 * Deletes pending organizations older than PENDING_WORKSPACE_TTL_HOURS.
 */
export async function runPendingOrganizationCleanup(): Promise<PendingCleanupResult> {
  console.log(
    "[billing/cleanup-pending] Starting pending organization cleanup...",
  );

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - PENDING_WORKSPACE_TTL_HOURS);

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
    `[billing/cleanup-pending] Found ${pendingOrgs.length} pending organizations to clean up`,
  );

  let deletedCount = 0;

  for (const org of pendingOrgs) {
    try {
      await db().delete(organization).where(eq(organization.id, org.id));
      deletedCount++;
      console.log(
        `[billing/cleanup-pending] Deleted pending workspace: ${org.id} (${org.name})`,
      );
    } catch (deleteError) {
      console.error(
        `[billing/cleanup-pending] Failed to delete workspace ${org.id}:`,
        deleteError,
      );
    }
  }

  console.log(
    `[billing/cleanup-pending] Complete. ${deletedCount} pending workspaces deleted.`,
  );

  return {
    found: pendingOrgs.length,
    deleted: deletedCount,
    cutoffTime: cutoffTime.toISOString(),
  };
}
