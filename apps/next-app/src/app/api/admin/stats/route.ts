import { getSiteAdminStatus } from "@/lib/auth-utils";
import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { gt, sql } from "@repo/database";
import { organization, payments, session, user } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await getSiteAdminStatus(authSession.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    return NextResponse.json({
      totalUsers: Number(totalUsers.count),
      totalOrganizations: Number(totalOrganizations.count),
      totalPayments: Number(totalPayments.count),
      activeSessions: activeSessions.length,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
