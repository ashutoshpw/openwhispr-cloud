import "server-only";

import { createClerkClient } from "@clerk/backend";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import * as schema from "@repo/database/schema";
import { getAuthConfig } from "../../config";
import type {
  AuthServerProvider,
  SignInResult,
  SignOutResult,
  SignUpResult,
  UnifiedSession,
} from "../../types";
import { checkUserExistsInClerk, createUserInClerk } from "./user-migration";

export class ClerkServer implements AuthServerProvider {
  private clerkClient: ReturnType<typeof createClerkClient>;
  private config: ReturnType<typeof getAuthConfig>;

  constructor() {
    this.config = getAuthConfig("clerk-dev");
    this.clerkClient = createClerkClient({
      secretKey: this.config.secretKey,
    });
  }

  async getSession(headers: Headers): Promise<UnifiedSession | null> {
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
            const { syncClerkUserToDb, syncClerkAccountToDb } = await import(
              "./db-sync"
            );
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
      return null;
    }
  }

  getApiHandler() {
    return {
      GET: async (req: Request) => {
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
      POST: async (req: Request) => {
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

      const bcrypt = await import("bcryptjs");
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
              name: localUser.name,
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

          const { syncClerkUserToDb, syncClerkAccountToDb } = await import(
            "./db-sync"
          );
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
        } catch (error: any) {
          if (error?.errors?.[0]?.code !== "form_identifier_exists") {
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
    } catch (error: any) {
      return {
        error: {
          message: error?.message || "Failed to sign in",
          code: error?.code || "SIGN_IN_ERROR",
        },
      };
    }
  }

  async signUpEmail(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<SignUpResult> {
    return {
      error: {
        message:
          "Clerk sign-up must be handled client-side. Use signUp.email() from @/lib/auth-client instead.",
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

        const { deleteClerkSessionFromDb } = await import("./db-sync");
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
