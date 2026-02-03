"use client";

import {
  signOut as authKitSignOut,
  getSignInUrl,
  getSignUpUrl,
} from "@workos-inc/authkit-nextjs";
import { useAuth as useAuthKitAuth } from "@workos-inc/authkit-nextjs/components";
import { getAuthConfig } from "../../config";
import type {
  AuthClientProvider,
  GetSessionResult,
  RequestPasswordResetParams,
  RequestPasswordResetResult,
  ResetPasswordParams,
  ResetPasswordResult,
  SignInResult,
  SignOutResult,
  SignUpResult,
  UseSessionResult,
} from "../../types";
import { mapAuthKitSession } from "../../utils/schema-mapper";

export class AuthKitClient implements AuthClientProvider {
  private baseURL: string;

  constructor() {
    const config = getAuthConfig("authkit");
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

  async signUpEmail(params: {
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

let clientInstance: AuthKitClient | null = null;

const getClientInstance = () => {
  if (!clientInstance) {
    clientInstance = new AuthKitClient();
  }
  return clientInstance;
};

export const useSession = () => {
  const client = getClientInstance();
  return client.useSession();
};
