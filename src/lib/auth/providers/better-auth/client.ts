"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { getAuthConfig } from "../../config";
import { mapBetterAuthSession } from "../../utils/schema-mapper";
import type {
  AuthClientProvider,
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
} from "../../types";

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

  async signInEmail(params: { email: string; password: string }): Promise<SignInResult> {
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
      const mappedSession = result.data ? mapBetterAuthSession(result.data) : null;
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
      const mappedSession = result.data ? mapBetterAuthSession(result.data) : null;
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
          message: error instanceof Error ? error.message : "Failed to sign out",
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
      const mappedSession = result.data ? mapBetterAuthSession(result.data) : null;
      return {
        data: mappedSession || undefined,
      };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Failed to get session",
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

