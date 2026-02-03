/**
 * @repo/auth/clerk/server - Clerk server implementation
 * Import via: import { ClerkServer } from "@repo/auth/clerk/server"
 */
import "server-only";

import { createClerkClient } from "@clerk/backend";
import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq, and } from "@repo/database";
import bcrypt from "bcryptjs";

import { getAuthConfig } from "../../config";
import type {
  AuthServerProvider,
  UnifiedSession,
  SignInResult,
  SignUpResult,
  SignOutResult,
} from "../../types";

// Helper functions
export interface LocalUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export async function checkUserExistsInClerk(
  email: string,
  clerkClient: ReturnType<typeof createClerkClient>,
): Promise<boolean> {
  try {
    const userList = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    return userList.data.length > 0;
  } catch (error) {
    console.error("[Clerk Migration] Error checking user existence:", error);
    return false;
  }
}

export async function createUserInClerk(
  localUser: LocalUser,
  password: string,
  clerkClient: ReturnType<typeof createClerkClient>,
): Promise<string | null> {
  try {
    const nameParts = (localUser.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || null;

    interface CreateUserParams {
      emailAddress: string[];
      password: string;
      firstName?: string;
      lastName?: string;
      skipPasswordChecks: boolean;
      skipPasswordRequirement: boolean;
      unsafeMetadata?: { image: string };
    }

    const createParams: CreateUserParams = {
      emailAddress: [localUser.email],
      password: password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
    };

    if (localUser.image) {
      createParams.unsafeMetadata = { image: localUser.image };
    }

    const createdUser = await clerkClient.users.createUser(createParams);

    return createdUser.id;
  } catch (error: unknown) {
    const err = error as { errors?: Array<{ code?: string }> };
    if (err?.errors?.[0]?.code === "form_identifier_exists") {
      console.log("[Clerk Migration] User already exists in Clerk");
      return null;
    }
    console.error("[Clerk Migration] Error creating user in Clerk:", error);
    throw error;
  }
}

// DB Sync functions
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
  clerkUser: ClerkUserData,
): Promise<string> {
  try {
    const { nanoid } = await import("nanoid");
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.emailAddresses[0]?.id,
      )?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      "";

    if (!primaryEmail) {
      throw new Error("No email address found for Clerk user");
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName]
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
  clerkUser: ClerkUserData,
): Promise<string> {
  try {
    const { nanoid } = await import("nanoid");

    const existingAccounts = await db()
      .select()
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, clerkUser.id),
          eq(schema.account.providerId, "clerk"),
        ),
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
    console.error("[Clerk DB Sync] Error syncing session to DB:", error);
    throw error;
  }
}

export async function deleteClerkSessionFromDb(
  sessionId: string,
): Promise<void> {
  try {
    await db().delete(schema.session).where(eq(schema.session.id, sessionId));
  } catch (error) {
    console.error("[Clerk DB Sync] Error deleting session from DB:", error);
    throw error;
  }
}

export class ClerkServer implements AuthServerProvider {
  private clerkClient: ReturnType<typeof createClerkClient>;
  private config: ReturnType<typeof getAuthConfig>;

  constructor() {
    this.config = getAuthConfig("clerk");
    this.clerkClient = createClerkClient({
      secretKey: this.config.secretKey,
    });
  }

  async getSession(_headers: Headers): Promise<UnifiedSession | null> {
    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const { userId, sessionId } = await auth();

      if (!userId || !sessionId) {
        return null;
      }

      const dbSessions = await db()
        .select()
        .from(schema.session)
        .where(eq(schema.session.id, sessionId))
        .limit(1);

      if (dbSessions.length === 0) {
        return null;
      }

      const dbSession = dbSessions[0];

      if (new Date(dbSession.expiresAt) < new Date()) {
        return null;
      }

      const users = await db()
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .limit(1);

      if (users.length === 0) {
        try {
          const user = await currentUser();
          if (user) {
            const clerkUser = {
              id: user.id,
              emailAddresses: user.emailAddresses.map((e) => ({
                emailAddress: e.emailAddress,
                id: e.id,
              })),
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            };
            await syncClerkUserToDb(clerkUser);
            await syncClerkAccountToDb(clerkUser);

            const syncedUsers = await db()
              .select()
              .from(schema.user)
              .where(eq(schema.user.id, userId))
              .limit(1);

            if (syncedUsers.length === 0) {
              return null;
            }

            const syncedUser = syncedUsers[0];

            return {
              user: {
                id: syncedUser.id,
                email: syncedUser.email,
                name: syncedUser.name,
                image: syncedUser.image,
              },
              expiresAt: dbSession.expiresAt,
            };
          }
        } catch (error) {
          console.error("[ClerkServer] Error syncing user to DB:", error);
        }
        return null;
      }

      const user = users[0];

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
        expiresAt: dbSession.expiresAt,
      };
    } catch (error) {
      console.error("[ClerkServer] Error getting session:", error);
      return null;
    }
  }

  getApiHandler() {
    return {
      GET: async (_req: Request) => {
        return new Response(
          JSON.stringify({
            error: "Clerk authentication is handled client-side",
          }),
          {
            status: 405,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
      POST: async (_req: Request) => {
        return new Response(
          JSON.stringify({
            error: "Clerk authentication is handled client-side",
          }),
          {
            status: 405,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    };
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      const localUsers = await db()
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, params.email))
        .limit(1);

      if (localUsers.length === 0) {
        return {
          error: {
            message: "Invalid email or password",
            code: "INVALID_CREDENTIALS",
          },
        };
      }

      const localUser = localUsers[0];

      const accounts = await db()
        .select()
        .from(schema.account)
        .where(
          and(
            eq(schema.account.userId, localUser.id),
            eq(schema.account.providerId, "credential"),
          ),
        )
        .limit(1);

      if (accounts.length === 0 || !accounts[0].password) {
        return {
          error: {
            message: "Invalid email or password",
            code: "INVALID_CREDENTIALS",
          },
        };
      }

      const isValid = await bcrypt.compare(
        params.password,
        accounts[0].password,
      );

      if (!isValid) {
        return {
          error: {
            message: "Invalid email or password",
            code: "INVALID_CREDENTIALS",
          },
        };
      }

      const userExistsInClerk = await checkUserExistsInClerk(
        params.email,
        this.clerkClient,
      );

      if (!userExistsInClerk) {
        try {
          await createUserInClerk(
            {
              id: localUser.id,
              email: localUser.email,
              name: localUser.name || "",
              image: localUser.image,
            },
            params.password,
            this.clerkClient,
          );

          await new Promise((resolve) => setTimeout(resolve, 500));

          let retries = 3;
          let verified = false;
          while (retries > 0 && !verified) {
            const exists = await checkUserExistsInClerk(
              params.email,
              this.clerkClient,
            );
            if (exists) {
              verified = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            retries--;
          }

          if (!verified) {
            console.warn(
              "[ClerkServer] User created but verification failed, proceeding anyway",
            );
          }

          const clerkUserList = await this.clerkClient.users.getUserList({
            emailAddress: [params.email],
            limit: 1,
          });

          if (clerkUserList.data.length > 0) {
            const clerkUser = clerkUserList.data[0];
            const clerkUserData = {
              id: clerkUser.id,
              emailAddresses: clerkUser.emailAddresses.map((e) => ({
                emailAddress: e.emailAddress,
                id: e.id,
              })),
              firstName: clerkUser.firstName,
              lastName: clerkUser.lastName,
              imageUrl: clerkUser.imageUrl,
              createdAt: clerkUser.createdAt,
              updatedAt: clerkUser.updatedAt,
            };
            await syncClerkUserToDb(clerkUserData);
            await syncClerkAccountToDb(clerkUserData);
          }
        } catch (error: unknown) {
          const err = error as { errors?: Array<{ code?: string }> };
          if (err?.errors?.[0]?.code !== "form_identifier_exists") {
            return {
              error: {
                message: "Failed to migrate user to Clerk",
                code: "MIGRATION_FAILED",
              },
            };
          }
        }
      }

      return {
        data: {
          user: {
            id: localUser.id,
            email: localUser.email,
            name: localUser.name,
            image: localUser.image,
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      };
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      return {
        error: {
          message: err?.message || "Failed to sign in",
          code: err?.code || "SIGN_IN_ERROR",
        },
      };
    }
  }

  async signUpEmail(_params: {
    email: string;
    password: string;
    name: string;
  }): Promise<SignUpResult> {
    return {
      error: {
        message:
          "Clerk sign-up must be handled client-side. Use signUp.email() from @repo/auth/clerk/client instead.",
        code: "CLIENT_SIDE_REQUIRED",
      },
    };
  }

  async signOut(): Promise<SignOutResult> {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { sessionId } = await auth();

      if (sessionId) {
        await this.clerkClient.sessions.revokeSession(sessionId);
        await deleteClerkSessionFromDb(sessionId);
      }

      return {};
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Failed to sign out",
        },
      };
    }
  }

  getAuthInstance() {
    return null;
  }
}
