import "server-only";

import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq } from "@repo/database";
import { NextRequest } from "next/server";
import { auth, handlers, signIn, signOut } from "./config";
import { mapNextAuthSession } from "../../utils/schema-mapper";
import type {
  AuthServerProvider,
  UnifiedSession,
  SignInResult,
  SignUpResult,
  SignOutResult,
} from "../../types";

export class NextAuthServer implements AuthServerProvider {
  async getSession(headers: Headers): Promise<UnifiedSession | null> {
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

  async signInEmail(params: { email: string; password: string }): Promise<SignInResult> {
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

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(params.password, 10);
      const { nanoid } = await import("nanoid");
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
          message: error instanceof Error ? error.message : "Failed to sign out",
        },
      };
    }
  }
}
