/**
 * @repo/auth/next-auth/server - NextAuth server implementation
 * Import via: import { NextAuthServer } from "@repo/auth/next-auth/server"
 */
import "server-only";

import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq, and } from "@repo/database";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "next-auth/adapters";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { getAuthConfig } from "../../config";
import { mapNextAuthSession } from "../../utils";
import type {
  AuthServerProvider,
  UnifiedSession,
  SignInResult,
  SignUpResult,
  SignOutResult,
} from "../../types";

// Create the NextAuth instance
function createNextAuthInstance() {
  // DrizzleAdapter schema types don't match across dialects
  // Cast through unknown to work around complex type inference
  const schemaConfig = {
    usersTable: schema.user,
    accountsTable: schema.account,
    verificationTokensTable: schema.verification,
  };

  const drizzleDb = db();
  const createAdapter = DrizzleAdapter as unknown as (
    db: typeof drizzleDb,
    config: typeof schemaConfig,
  ) => Adapter;

  const adapter = createAdapter(drizzleDb, schemaConfig);

  return NextAuth({
    adapter,
    secret: getAuthConfig("next-auth").secret,
    session: {
      strategy: "jwt",
    },
    providers: [
      Credentials({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const users = await db()
            .select()
            .from(schema.user)
            .where(eq(schema.user.email, credentials.email as string))
            .limit(1);

          if (users.length === 0) {
            return null;
          }

          const accounts = await db()
            .select()
            .from(schema.account)
            .where(
              and(
                eq(schema.account.userId, users[0].id),
                eq(schema.account.providerId, "credential"),
              ),
            )
            .limit(1);

          if (accounts.length === 0 || !accounts[0].password) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            accounts[0].password,
          );

          if (!isValid) {
            return null;
          }

          return {
            id: users[0].id,
            email: users[0].email,
            name: users[0].name,
            image: users[0].image,
          };
        },
      }),
    ],
    pages: {
      signIn: "/sign-in",
      signOut: "/sign-out",
      error: "/sign-in",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.image = user.image;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user && token) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.image = token.image as string;
        }
        return session;
      },
    },
  });
}

// Lazy initialization
let nextAuthInstance: ReturnType<typeof createNextAuthInstance> | null = null;

function getNextAuthInstance() {
  if (!nextAuthInstance) {
    nextAuthInstance = createNextAuthInstance();
  }
  return nextAuthInstance;
}

export const { auth, handlers, signIn, signOut } = {
  get auth() {
    return getNextAuthInstance().auth;
  },
  get handlers() {
    return getNextAuthInstance().handlers;
  },
  get signIn() {
    return getNextAuthInstance().signIn;
  },
  get signOut() {
    return getNextAuthInstance().signOut;
  },
};

export class NextAuthServer implements AuthServerProvider {
  async getSession(_headers: Headers): Promise<UnifiedSession | null> {
    try {
      const session = await auth();

      if (!session || !session.user || !session.user.id) {
        return null;
      }

      let expiresString: string | null = null;
      if (session.expires) {
        const expires = session.expires as unknown;
        if (expires instanceof Date) {
          expiresString = expires.toISOString();
        } else if (typeof session.expires === "string") {
          expiresString = session.expires;
        } else if (typeof session.expires === "number") {
          expiresString = new Date(session.expires).toISOString();
        }
      }

      return mapNextAuthSession({
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name || null,
          image: session.user.image || null,
        },
        expires: expiresString,
      });
    } catch (error) {
      console.error("[NextAuthServer] Error getting session:", error);
      return null;
    }
  }

  getApiHandler() {
    return {
      GET: async (req: Request) => {
        return handlers.GET(req as NextRequest);
      },
      POST: async (req: Request) => {
        return handlers.POST(req as NextRequest);
      },
    };
  }

  getAuthInstance() {
    return { auth, handlers, signIn, signOut };
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      const result = await signIn("credentials", {
        email: params.email,
        password: params.password,
        redirect: false,
      });

      if (result?.error) {
        return {
          error: {
            message: result.error || "Failed to sign in",
          },
        };
      }

      const session = await auth();
      if (!session || !session.user) {
        return {
          error: {
            message: "Failed to create session",
          },
        };
      }

      let expiresString: string | null = null;
      if (session.expires) {
        const expires = session.expires as unknown;
        if (expires instanceof Date) {
          expiresString = expires.toISOString();
        } else if (typeof session.expires === "string") {
          expiresString = session.expires;
        } else if (typeof session.expires === "number") {
          expiresString = new Date(session.expires).toISOString();
        }
      }

      const mappedSession = mapNextAuthSession({
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name || null,
          image: session.user.image || null,
        },
        expires: expiresString,
      });

      return {
        data: mappedSession,
      };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Failed to sign in",
        },
      };
    }
  }

  async signUpEmail(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<SignUpResult> {
    try {
      const existingUsers = await db()
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, params.email))
        .limit(1);

      if (existingUsers.length > 0) {
        return {
          error: {
            message: "User with this email already exists",
          },
        };
      }

      const hashedPassword = await bcrypt.hash(params.password, 10);
      const userId = nanoid();

      await db().insert(schema.user).values({
        id: userId,
        email: params.email,
        name: params.name,
        emailVerified: false,
        role: "user",
      });

      await db().insert(schema.account).values({
        id: nanoid(),
        accountId: params.email,
        providerId: "credential",
        userId: userId,
        password: hashedPassword,
      });

      const signInResult = await signIn("credentials", {
        email: params.email,
        password: params.password,
        redirect: false,
      });

      if (signInResult?.error) {
        return {
          error: {
            message: `User created but sign-in failed: ${signInResult.error}`,
          },
        };
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const expiresString = expiresAt.toISOString();

      const mappedSession = mapNextAuthSession({
        user: {
          id: userId,
          email: params.email,
          name: params.name,
          image: null,
        },
        expires: expiresString,
      });

      return {
        data: mappedSession,
      };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Failed to sign up",
        },
      };
    }
  }

  async signOut(): Promise<SignOutResult> {
    try {
      await signOut({ redirect: false });
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
}
