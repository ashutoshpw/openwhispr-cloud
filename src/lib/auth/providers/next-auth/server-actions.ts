"use server";

import { NextAuthServer } from "./server";
import type { UnifiedSession, SignUpResult, SignInResult, SignOutResult } from "../../types";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

let serverInstance: NextAuthServer | null = null;

function getNextAuthServerInstance(): NextAuthServer {
  if (!serverInstance) {
    serverInstance = new NextAuthServer();
  }
  return serverInstance;
}

export async function getNextAuthSession(
  headers: Headers
): Promise<UnifiedSession | null> {
  const server = getNextAuthServerInstance();
  return server.getSession(headers);
}

export async function getNextAuthApiHandler() {
  const server = getNextAuthServerInstance();
  return server.getApiHandler();
}

export async function signUpNextAuth(params: {
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

    const signInResult = await signInNextAuth({
      email: params.email,
      password: params.password,
    });

    if (signInResult.error) {
      return {
        error: {
          message: "Account created but failed to sign in. Please try signing in manually.",
        },
      };
    }

    return signInResult;
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Failed to sign up",
      },
    };
  }
}

export async function signInNextAuth(params: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  try {
    const users = await db()
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, params.email))
      .limit(1);

    if (users.length === 0) {
      return {
        error: {
          message: "Invalid email or password",
        },
      };
    }

    const accounts = await db()
      .select()
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, users[0].id),
          eq(schema.account.providerId, "credential")
        )
      )
      .limit(1);

    if (accounts.length === 0 || !accounts[0].password) {
      return {
        error: {
          message: "Invalid email or password",
        },
      };
    }

    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(params.password, accounts[0].password);

    if (!isValid) {
      return {
        error: {
          message: "Invalid email or password",
        },
      };
    }

    const session = await getNextAuthSession(new Headers());
    if (session) {
      return { data: session };
    }

    return {
      error: {
        message: "Failed to create session",
      },
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Failed to sign in",
      },
    };
  }
}

export async function signOutNextAuth(): Promise<SignOutResult> {
  try {
    return {};
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Failed to sign out",
      },
    };
  }
}

