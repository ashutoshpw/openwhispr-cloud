/**
 * @repo/auth/client - NextAuth client implementation
 */
"use client";

import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
  useSession as useNextAuthSession,
  getSession as getNextAuthSession,
} from "next-auth/react";

import type {
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
  RequestPasswordResetParams,
  RequestPasswordResetResult,
  ResetPasswordParams,
  ResetPasswordResult,
  UnifiedSession,
  UnifiedUser,
} from "./types";

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

  return { baseURL };
}

class NextAuthClient {
  private baseURL: string;

  constructor() {
    const config = getAuthConfig();
    this.baseURL = config.baseURL;
  }

  getBaseClient() {
    return {
      signIn: nextAuthSignIn,
      signOut: nextAuthSignOut,
      useSession: useNextAuthSession,
      getSession: getNextAuthSession,
    };
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      const result = await nextAuthSignIn("credentials", {
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

      if (!result?.ok) {
        return {
          error: {
            message: "Failed to sign in",
          },
        };
      }

      const session = await getNextAuthSession();
      if (!session || !session.user || !session.user.id) {
        return {
          error: {
            message: "Session was not created. Please try signing in again.",
          },
        };
      }

      const mappedSession = mapNextAuthSession({
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        },
        expires: session.expires ?? null,
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
      const response = await fetch(`${this.baseURL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.email,
          password: params.password,
          name: params.name,
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: "Failed to sign up" } }));
        return {
          error: {
            message:
              error.error?.message || error.message || "Failed to sign up",
          },
        };
      }

      const signInResult = await this.signInEmail({
        email: params.email,
        password: params.password,
      });

      if (signInResult.error) {
        return {
          error: {
            message: `Account created successfully, but automatic sign-in failed: ${signInResult.error.message}. Please sign in manually.`,
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

  async signOut(): Promise<SignOutResult> {
    try {
      await nextAuthSignOut({ redirect: false });
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

  async getSession(): Promise<GetSessionResult> {
    try {
      const session = await getNextAuthSession();
      if (
        !session ||
        !session.user ||
        !session.user.id ||
        !session.user.email
      ) {
        return { data: undefined };
      }
      const mappedSession = mapNextAuthSession({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        },
        expires: session.expires ?? null,
      });
      return {
        data: mappedSession || undefined,
      };
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Failed to get session",
        },
      };
    }
  }

  useSession(): UseSessionResult {
    const { data: session, status } = useNextAuthSession();
    const isLoading = status === "loading" || status === undefined;
    if (!session || !session.user || !session.user.id || !session.user.email) {
      return {
        data: null,
        isLoading,
      };
    }
    const mappedSession = mapNextAuthSession({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      },
      expires: session.expires ?? null,
    });
    return {
      data: mappedSession,
      isLoading,
    };
  }

  async requestPasswordReset(
    params: RequestPasswordResetParams,
  ): Promise<RequestPasswordResetResult> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: params.email }),
      });

      const result = await response.json();

      if (result.error) {
        return {
          error: {
            message: result.error.message || "Failed to request password reset",
            code: result.error.code,
          },
        };
      }

      return { success: true };
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to request password reset",
        },
      };
    }
  }

  async resetPassword(
    params: ResetPasswordParams,
  ): Promise<ResetPasswordResult> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: params.token,
          newPassword: params.newPassword,
        }),
      });

      const result = await response.json();

      if (result.error) {
        return {
          error: {
            message: result.error.message || "Failed to reset password",
            code: result.error.code,
          },
        };
      }

      return { success: true };
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Failed to reset password",
        },
      };
    }
  }
}

// Singleton instance
let clientInstance: NextAuthClient | null = null;

function getClientInstance(): NextAuthClient {
  if (!clientInstance) {
    clientInstance = new NextAuthClient();
  }
  return clientInstance;
}

// Convenience exports
export const signIn = {
  email: (params: { email: string; password: string }) =>
    getClientInstance().signInEmail(params),
};

export const signUp = {
  email: (params: { email: string; password: string; name: string }) =>
    getClientInstance().signUpEmail(params),
};

export const signOut = () => getClientInstance().signOut();
export const getSession = () => getClientInstance().getSession();
export const useSession = () => getClientInstance().useSession();
export const getBaseClient = () => getClientInstance().getBaseClient();

export const forgotPassword = {
  request: (params: RequestPasswordResetParams) =>
    getClientInstance().requestPasswordReset(params),
  reset: (params: ResetPasswordParams) =>
    getClientInstance().resetPassword(params),
};
