import { auth } from "@repo/auth/server";
import { db, desc, eq } from "@repo/database";
import { session } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const reqHeaders = await headers();
  const result = await auth.api.getSession({ headers: reqHeaders });
  if (!result?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db()
    .select({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      token: session.token,
    })
    .from(session)
    .where(eq(session.userId, result.user.id))
    .orderBy(desc(session.updatedAt));

  // Identify current session by matching token cookie
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const sessions = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    isCurrent: row.token ? cookieHeader.includes(row.token) : false,
  }));

  return NextResponse.json({ sessions });
}
