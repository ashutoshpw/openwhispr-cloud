/**
 * @repo/auth/client - WorkOS AuthKit client implementation
 */
"use client";

import { useAuth as useAuthKitAuth } from "@workos-inc/authkit-nextjs/components";
import {
  getSignInUrl,
  getSignUpUrl,
  signOut as authKitSignOut,
} from "@workos-inc/authkit-nextjs";

import type {
  UnifiedSession,
  UnifiedUser,
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
  RequestPasswordResetParams,
  RequestPasswordResetResult,
  ResetPasswordParams,
  ResetPasswordResult,
} from "./types";

// Configuration
function getAuthConfig() {
  return {
    baseURL:
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
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

function mapAuthKitSession(
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

// Client implementation
class AuthKitClient {
  private baseURL: string;

  constructor() {
    const config = getAuthConfig();
    this.baseURL = config.baseURL;
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (result.error) {
        if (
          result.error.code === "user_not_found" ||
          result.error.message?.includes("not found")
        ) {
          const signInUrl = await getSignInUrl();
          window.location.href = signInUrl;
          return {
            data: undefined,
          };
        }

        return {
          error: {
            message: result.error.message || "Failed to sign in",
            code: result.error.code,
          },
        };
      }

      if (result.data) {
        window.location.reload();
        return {
          data: result.data,
        };
      }

      const signInUrl = await getSignInUrl();
      window.location.href = signInUrl;
      return {
        data: undefined,
      };
    } catch (error) {
      try {
        const signInUrl = await getSignInUrl();
        window.location.href = signInUrl;
        return {
          data: undefined,
        };
      } catch (redirectError) {
        return {
          error: {
            message:
              error instanceof Error ? error.message : "Failed to sign in",
          },
        };
      }
    }
  }

  async signUpEmail(_params: {
    email: string;
    password: string;
    name: string;
  }): Promise<SignUpResult> {
    try {
      const signUpUrl = await getSignUpUrl();
      window.location.href = signUpUrl;
      return {
        data: undefined,
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
      await authKitSignOut({ returnTo: "/" });
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
      const response = await fetch(`${this.baseURL}/api/auth/get-session`);
      const result = await response.json();

      if (result.error) {
        return {
          error: {
            message: result.error.message || "Failed to get session",
          },
        };
      }

      return {
        data: result.data || undefined,
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
    const { user, loading } = useAuthKitAuth();

    if (loading) {
      return {
        data: null,
        isLoading: true,
      };
    }

    if (!user) {
      return {
        data: null,
        isLoading: false,
      };
    }

    const session = mapAuthKitSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profilePictureUrl: user.profilePictureUrl || null,
    });

    return {
      data: session,
      isLoading: false,
    };
  }

  async requestPasswordReset(
    _params: RequestPasswordResetParams,
  ): Promise<RequestPasswordResetResult> {
    // AuthKit/WorkOS handles password reset through their hosted UI
    try {
      const signInUrl = await getSignInUrl();
      if (typeof window !== "undefined") {
        // WorkOS handles forgot password in their hosted sign-in flow
        window.location.href = signInUrl;
      }
      return { success: true };
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to redirect to password reset",
        },
      };
    }
  }

  async resetPassword(
    _params: ResetPasswordParams,
  ): Promise<ResetPasswordResult> {
    // AuthKit/WorkOS handles password reset through their hosted UI
    return {
      error: {
        message:
          "Password reset is handled by WorkOS. Please use the forgot password flow.",
        code: "WORKOS_HOSTED_UI",
      },
    };
  }

  getBaseClient() {
    return null;
  }
}

// Singleton instance
let clientInstance: AuthKitClient | null = null;

export function getClientInstance(): AuthKitClient {
  if (!clientInstance) {
    clientInstance = new AuthKitClient();
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

export const forgotPassword = {
  request: (params: RequestPasswordResetParams) =>
    getClientInstance().requestPasswordReset(params),
  reset: (params: ResetPasswordParams) =>
    getClientInstance().resetPassword(params),
};

// Re-export types
export type {
  UnifiedSession,
  UnifiedUser,
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
};
