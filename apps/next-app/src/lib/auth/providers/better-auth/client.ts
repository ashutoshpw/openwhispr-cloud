"use client";

import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getAuthConfig } from "../../config";
import type {
  AuthClientProvider,
  GetSessionResult,
  RequestPasswordResetParams,
  RequestPasswordResetResult,
  ResetPasswordParams,
  ResetPasswordResult,
  SignInResult,
  SignInSocialParams,
  SignOutResult,
  SignUpResult,
  UseSessionResult,
} from "../../types";
import { mapBetterAuthSession } from "../../utils/schema-mapper";

export class BetterAuthClient implements AuthClientProvider {
  private client;

  constructor() {
    const config = getAuthConfig("better-auth");

    this.client = createAuthClient({
      baseURL: config.baseURL,
      plugins: [organizationClient()],
    });
  }

  getBaseClient() {
    return this.client;
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      const result = await this.client.signIn.email(params);
      if (result.error) {
        return {
          error: {
            message: result.error.message || "Failed to sign in",
            code: result.error.code,
          },
        };
      }
      const mappedSession = result.data
        ? mapBetterAuthSession(result.data)
        : null;
      return {
        data: mappedSession || undefined,
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
      const result = await this.client.signUp.email(params);
      if (result.error) {
        return {
          error: {
            message: result.error.message || "Failed to sign up",
            code: result.error.code,
          },
        };
      }
      const mappedSession = result.data
        ? mapBetterAuthSession(result.data)
        : null;
      return {
        data: mappedSession || undefined,
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
      await this.client.signOut();
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
      const result = await this.client.getSession();
      if (result.error) {
        return {
          error: {
            message: result.error.message || "Failed to get session",
            code: result.error.code,
          },
        };
      }
      const mappedSession = result.data
        ? mapBetterAuthSession(result.data)
        : null;
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
    const { data, isPending } = this.client.useSession();
    if (!data) {
      return {
        data: null,
        isLoading: isPending,
      };
    }
    const mappedSession = mapBetterAuthSession(data);
    return {
      data: mappedSession,
      isLoading: isPending,
    };
  }

  async requestPasswordReset(
    params: RequestPasswordResetParams,
  ): Promise<RequestPasswordResetResult> {
    try {
      // @ts-expect-error - forgetPassword exists but may not be in types
      const result = await this.client.forgetPassword({
        email: params.email,
        redirectTo: params.redirectTo,
      });
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
      const result = await this.client.resetPassword({
        newPassword: params.newPassword,
        token: params.token,
      });
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

  async signInSocial(params: SignInSocialParams): Promise<void> {
    await this.client.signIn.social({
      provider: params.provider as "google",
      callbackURL: params.callbackURL,
    });
  }
}

let clientInstance: BetterAuthClient | null = null;

const getClientInstance = () => {
  if (!clientInstance) {
    clientInstance = new BetterAuthClient();
  }
  return clientInstance;
};

export const useSession = () => {
  const client = getClientInstance();
  return client.useSession();
};
