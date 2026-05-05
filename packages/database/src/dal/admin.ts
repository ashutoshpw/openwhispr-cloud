import { gt, sql } from "drizzle-orm";
import { db } from "../client";
import { organization, payments, session, user } from "../schema";

export interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalPayments: number;
  activeSessions: number;
}

/**
 * Fetch aggregate admin statistics in a single pass.
 * Used by the admin dashboard page, the stats API route, and the MCP admin tool.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const [totalUsers] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(user);

  const [totalOrganizations] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(organization);

  const [totalPayments] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(payments);

  const activeSessions = await db()
    .select({ id: session.id })
    .from(session)
    .where(gt(session.expiresAt, new Date()));

  return {
    totalUsers: Number(totalUsers.count),
    totalOrganizations: Number(totalOrganizations.count),
    totalPayments: Number(totalPayments.count),
    activeSessions: activeSessions.length,
  };
}
