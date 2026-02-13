/**
 * @repo/auth/server - NextAuth server implementation
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

import type { UnifiedSession, UnifiedUser } from "./types";

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

function mapNextAuthSession(
  session:
    | {
        user: {
          id: string;
          email: string;
          name?: string | null;
          image?: string | null;
        };
        expires?: string | null;
      }
    | null
    | undefined,
): UnifiedSession | null {
  if (!session) return null;

  const expiresAt = session.expires
    ? new Date(session.expires)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    user: normalizeUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: null,
    }),
    expiresAt,
  };
}

// Get auth config from environment
function getAuthConfig() {
  const baseURL =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const secret = process.env.NEXTAUTH_SECRET || "development-secret-change-me";

  return { baseURL, secret };
}

// Create the NextAuth instance
function createNextAuthInstance() {
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
    secret: getAuthConfig().secret,
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

export async function getSession(
  headers: Headers,
): Promise<UnifiedSession | null> {
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
    console.error("[NextAuth] Error getting session:", error);
    return null;
  }
}

// Export mapper for use in other modules
export { mapNextAuthSession };
