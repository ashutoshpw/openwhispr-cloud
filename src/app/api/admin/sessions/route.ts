import { db } from "@/lib/db";
import { session } from "@/lib/db/schema";
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

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

    const sessions = await db()
      .select()
      .from(session)
      .orderBy(session.createdAt);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

