import "server-only";

import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import * as schema from "@repo/database/schema";
import { nanoid } from "nanoid";

export interface AuthKitUserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export async function syncAuthKitUserToDb(
  authKitUser: AuthKitUserData,
): Promise<string> {
  try {
    if (!authKitUser.email) {
      throw new Error("No email address found for AuthKit user");
    }

    const name =
      [authKitUser.firstName, authKitUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || authKitUser.email.split("@")[0];

    const existingUsers = await db()
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, authKitUser.id))
      .limit(1);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      const needsUpdate =
        existingUser.email !== authKitUser.email ||
        existingUser.name !== name ||
        existingUser.image !== authKitUser.profilePictureUrl;

      if (needsUpdate) {
        await db()
          .update(schema.user)
          .set({
            email: authKitUser.email,
            name: name,
            image: authKitUser.profilePictureUrl,
            updatedAt: new Date(),
          })
          .where(eq(schema.user.id, authKitUser.id));
      }
      return authKitUser.id;
    }

    await db().insert(schema.user).values({
      id: authKitUser.id,
      email: authKitUser.email,
      name: name,
      emailVerified: true,
      image: authKitUser.profilePictureUrl,
      role: "user",
    });

    return authKitUser.id;
  } catch (error) {
    console.error("[AuthKit DB Sync] Error syncing user to DB:", error);
    throw error;
  }
}

export async function syncAuthKitAccountToDb(
  authKitUser: AuthKitUserData,
): Promise<string> {
  try {
    const existingAccounts = await db()
      .select()
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, authKitUser.id),
          eq(schema.account.providerId, "authkit"),
        ),
      )
      .limit(1);

    if (existingAccounts.length > 0) {
      return existingAccounts[0].id;
    }

    const accountId = nanoid();
    await db().insert(schema.account).values({
      id: accountId,
      accountId: authKitUser.id,
      providerId: "authkit",
      userId: authKitUser.id,
    });

    return accountId;
  } catch (error) {
    console.error("[AuthKit DB Sync] Error syncing account to DB:", error);
    throw error;
  }
}
