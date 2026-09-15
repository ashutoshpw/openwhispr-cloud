import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { user } from "@repo/database/schema";
import { headers } from "next/headers";

export async function getSiteAdminStatus(userId: string): Promise<boolean> {
  const userRecord = await db()
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (userRecord.length === 0) {
    return false;
  }

  return userRecord[0].role === "site-admin";
}

export async function isSiteAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return false;
  }

  return getSiteAdminStatus(session.user.id);
}

export async function getCurrentUserRole(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const userRecord = await db()
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (userRecord.length === 0) {
    return null;
  }

  return userRecord[0].role;
}
