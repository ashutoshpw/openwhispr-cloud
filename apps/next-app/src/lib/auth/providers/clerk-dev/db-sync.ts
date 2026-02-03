import "server-only";

import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq, and } from "@repo/database";
import { nanoid } from "nanoid";

export interface ClerkUserData {
  id: string;
  emailAddresses: Array<{ emailAddress: string; id: string }>;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export async function syncClerkUserToDb(
  clerkUser: ClerkUserData
): Promise<string> {
  try {
    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.emailAddresses[0]?.id)
        ?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || "";

    if (!primaryEmail) {
      throw new Error("No email address found for Clerk user");
    }

    const name = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || primaryEmail.split("@")[0];

    const existingUsers = await db()
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, clerkUser.id))
      .limit(1);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      const needsUpdate =
        existingUser.email !== primaryEmail ||
        existingUser.name !== name ||
        existingUser.image !== clerkUser.imageUrl;

      if (needsUpdate) {
        await db()
          .update(schema.user)
          .set({
            email: primaryEmail,
            name: name,
            image: clerkUser.imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(schema.user.id, clerkUser.id));
      }
      return clerkUser.id;
    }

    await db().insert(schema.user).values({
      id: clerkUser.id,
      email: primaryEmail,
      name: name,
      emailVerified: true,
      image: clerkUser.imageUrl,
      role: "user",
    });

    return clerkUser.id;
  } catch (error) {
    console.error("[Clerk DB Sync] Error syncing user to DB:", error);
    throw error;
  }
}

export async function syncClerkAccountToDb(
  clerkUser: ClerkUserData
): Promise<string> {
  try {
    const existingAccounts = await db()
      .select()
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, clerkUser.id),
          eq(schema.account.providerId, "clerk")
        )
      )
      .limit(1);

    if (existingAccounts.length > 0) {
      return existingAccounts[0].id;
    }

    const accountId = nanoid();
    await db().insert(schema.account).values({
      id: accountId,
      accountId: clerkUser.id,
      providerId: "clerk",
      userId: clerkUser.id,
    });

    return accountId;
  } catch (error) {
    console.error("[Clerk DB Sync] Error syncing account to DB:", error);
    throw error;
  }
}

export async function syncClerkSessionToDb(
  sessionId: string,
  userId: string,
  expiresAt: Date,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<string> {
  try {
    const existingSessions = await db()
      .select()
      .from(schema.session)
      .where(eq(schema.session.id, sessionId))
      .limit(1);

    if (existingSessions.length > 0) {
      await db()
        .update(schema.session)
        .set({
          expiresAt: expiresAt,
          updatedAt: new Date(),
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        })
        .where(eq(schema.session.id, sessionId));
      return sessionId;
    }

    await db().insert(schema.session).values({
      id: sessionId,
      token: sessionId,
      userId: userId,
      expiresAt: expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    return sessionId;
  } catch (error) {
    console.error("[Clerk DB Sync] Error syncing session to DB:", error);
    throw error;
  }
}

export async function deleteClerkSessionFromDb(
  sessionId: string
): Promise<void> {
  try {
    await db().delete(schema.session).where(eq(schema.session.id, sessionId));
  } catch (error) {
    console.error("[Clerk DB Sync] Error deleting session from DB:", error);
    throw error;
  }
}

