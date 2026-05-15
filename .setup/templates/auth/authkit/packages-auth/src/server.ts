/**
 * @repo/auth/server - WorkOS AuthKit server implementation
 */
import "server-only";

import { authkit } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import type { NextRequest } from "next/server";
import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq, and } from "@repo/database";
import { nanoid } from "nanoid";

import type {
  UnifiedSession,
  UnifiedUser,
  SignInResult,
  SignUpResult,
  SignOutResult,
} from "./types";

// Configuration
function getAuthConfig() {
  return {
    apiKey: process.env.WORKOS_API_KEY || "",
    clientId: process.env.WORKOS_CLIENT_ID || "",
    cookiePassword:
      process.env.WORKOS_COOKIE_PASSWORD ||
      process.env.AUTH_SECRET ||
      "at-least-32-characters-long-secret-key",
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}

// Session mapper
function normalizeUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
}): UnifiedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role ?? null,
  };
}

export function mapAuthKitSession(
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
  },
  expiresAt?: Date,
): UnifiedSession {
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email.split("@")[0];

  return {
    user: normalizeUser({
      id: user.id,
      email: user.email,
      name,
      image: user.profilePictureUrl,
      role: null,
    }),
    expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

// DB Sync functions
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

export async function syncAuthKitSessionToDb(
  sessionId: string,
  userId: string,
  expiresAt: Date,
  ipAddress?: string | null,
  userAgent?: string | null,
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

    await db()
      .insert(schema.session)
      .values({
        id: sessionId,
        token: sessionId,
        userId: userId,
        expiresAt: expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });

    return sessionId;
  } catch (error) {
    console.error("[AuthKit DB Sync] Error syncing session to DB:", error);
    throw error;
  }
}

export async function deleteAuthKitSessionFromDb(
  sessionId: string,
): Promise<void> {
  try {
    await db().delete(schema.session).where(eq(schema.session.id, sessionId));
  } catch (error) {
    console.error("[AuthKit DB Sync] Error deleting session from DB:", error);
    throw error;
  }
}

// Lazy initialization of WorkOS client
let workosInstance: WorkOS | null = null;

function getWorkOS(): WorkOS {
  if (!workosInstance) {
    const config = getAuthConfig();
    if (!config.apiKey) {
      throw new Error("WORKOS_API_KEY is not configured");
    }
    workosInstance = new WorkOS(config.apiKey);
  }
  return workosInstance;
}

// Server-side auth functions
export async function getSession(
  headers: Headers,
): Promise<UnifiedSession | null> {
  try {
    const config = getAuthConfig();
    const url = config.baseURL || "http://localhost:3000";
    const request = new Request(url, {
      headers: headers,
    });

    const { session } = await authkit(request as NextRequest);

    if (!session || !session.user) {
      return null;
    }

    // Sync user to database
    const authKitUser: AuthKitUserData = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName || null,
      lastName: session.user.lastName || null,
      profilePictureUrl: session.user.profilePictureUrl || null,
    };

    try {
      await syncAuthKitUserToDb(authKitUser);
      await syncAuthKitAccountToDb(authKitUser);
    } catch (error) {
      console.error("[AuthKit] Error syncing user to DB:", error);
    }

    return mapAuthKitSession({
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName || null,
      lastName: session.user.lastName || null,
      profilePictureUrl: session.user.profilePictureUrl || null,
    });
  } catch (error) {
    console.error("[AuthKit] Error getting session:", error);
    return null;
  }
}

export async function signInEmail(params: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  try {
    const config = getAuthConfig();
    const workos = getWorkOS();

    // Check if user exists locally
    const localUsers = await db()
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, params.email))
      .limit(1);

    if (localUsers.length > 0) {
      const localUser = localUsers[0];

      // Try to get user from WorkOS, create if not exists
      try {
        await workos.userManagement.getUser(localUser.id);
      } catch (error: unknown) {
        const err = error as { code?: string; statusCode?: number };
        if (err?.code === "user_not_found" || err?.statusCode === 404) {
          const [firstName, ...lastNameParts] = (localUser.name || "").split(
            " ",
          );
          const lastName = lastNameParts.join(" ") || null;

          try {
            await workos.userManagement.createUser({
              email: localUser.email,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              password: params.password,
            });
          } catch (createError: unknown) {
            const cErr = createError as { code?: string };
            if (cErr?.code !== "user_already_exists") {
              throw createError;
            }
          }
        } else {
          throw error;
        }
      }
    }

    const response = await workos.userManagement.authenticateWithPassword({
      email: params.email,
      password: params.password,
      clientId: config.clientId,
      session: {
        sealSession: true,
        cookiePassword: config.cookiePassword,
      },
    });

    if (response.user) {
      const session = mapAuthKitSession(response.user);
      return {
        data: session || undefined,
      };
    }

    return {
      error: {
        message: "Authentication failed",
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === "invalid_credentials" ||
      err?.code === "invalid_password"
    ) {
      return {
        error: {
          message: "Invalid email or password",
          code: err?.code,
        },
      };
    }

    return {
      error: {
        message: err?.message || "Failed to sign in",
        code: err?.code,
      },
    };
  }
}

export async function signUpEmail(params: {
  email: string;
  password: string;
  name: string;
}): Promise<SignUpResult> {
  try {
    const workos = getWorkOS();

    const [firstName, ...lastNameParts] = params.name.split(" ");
    const lastName = lastNameParts.join(" ") || null;

    const user = await workos.userManagement.createUser({
      email: params.email,
      password: params.password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });

    if (user) {
      // Sync to local database
      const authKitUser: AuthKitUserData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
      };

      await syncAuthKitUserToDb(authKitUser);
      await syncAuthKitAccountToDb(authKitUser);

      const session = mapAuthKitSession({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
      });

      return {
        data: session || undefined,
      };
    }

    return {
      error: {
        message: "Failed to create user",
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    return {
      error: {
        message: err?.message || "Failed to sign up",
        code: err?.code,
      },
    };
  }
}

export async function signOut(): Promise<SignOutResult> {
  // AuthKit signOut is handled client-side via the signOut function
  return {};
}

// Auth API object for compatibility
export const auth = {
  api: {
    getSession: async (options: { headers: Headers }) => {
      return getSession(options.headers);
    },
  },
};
