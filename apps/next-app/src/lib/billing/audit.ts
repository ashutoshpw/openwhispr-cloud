import { db } from "@repo/database";
import { orgAuditLogs } from "@repo/database/schema";
import { eq, desc } from "@repo/database";
import type { AuditAction } from "./types";

export interface LogBillingEventParams {
  organizationId: string;
  action: AuditAction;
  fromValue?: string | null;
  toValue?: string | null;
  metadata?: Record<string, unknown>;
  performedBy: string; // User ID or "system"
}

/**
 * Log a billing-related event for an organization
 */
export async function logBillingEvent(
  params: LogBillingEventParams,
): Promise<void> {
  const { nanoid } = await import("nanoid");

  await db()
    .insert(orgAuditLogs)
    .values({
      id: nanoid(),
      organizationId: params.organizationId,
      action: params.action,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      performedBy: params.performedBy,
    });
}

/**
 * Get audit logs for an organization
 */
export async function getOrganizationAuditLogs(
  orgId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
  },
) {
  let query = db()
    .select()
    .from(orgAuditLogs)
    .where(eq(orgAuditLogs.organizationId, orgId))
    .orderBy(desc(orgAuditLogs.createdAt));

  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  const logs = await query;

  return logs.map((log) => ({
    ...log,
    metadata: log.metadata ? JSON.parse(log.metadata) : null,
  }));
}

/**
 * Get the latest audit log for an organization by action type
 */
export async function getLatestAuditLog(orgId: string, action: AuditAction) {
  const logs = await db()
    .select()
    .from(orgAuditLogs)
    .where(eq(orgAuditLogs.organizationId, orgId))
    .orderBy(desc(orgAuditLogs.createdAt))
    .limit(1);

  if (!logs[0]) return null;

  return {
    ...logs[0],
    metadata: logs[0].metadata ? JSON.parse(logs[0].metadata) : null,
  };
}
