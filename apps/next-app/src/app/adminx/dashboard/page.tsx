import { StatsCards } from "@/components/admin/StatsCards";
import { db } from "@repo/database";
import { user, organization, payments, session } from "@repo/database/schema";
import { sql, gt } from "@repo/database";

async function getStats() {
  try {
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
      .select()
      .from(session)
      .where(gt(session.expiresAt, new Date()));

    return {
      totalUsers: Number(totalUsers.count),
      totalOrganizations: Number(totalOrganizations.count),
      totalPayments: Number(totalPayments.count),
      activeSessions: activeSessions.length,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      totalUsers: 0,
      totalOrganizations: 0,
      totalPayments: 0,
      activeSessions: 0,
    };
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of system statistics and metrics
        </p>
      </div>
      <StatsCards
        totalUsers={stats.totalUsers}
        totalOrganizations={stats.totalOrganizations}
        totalPayments={stats.totalPayments}
        activeSessions={stats.activeSessions}
      />
    </div>
  );
}

