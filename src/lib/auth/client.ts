"use client";

import type {
  AuthClientProvider,
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
} from "./types";

class BaseAuthClient {
  private provider: AuthClientProvider | null = null;
  private loading: Promise<AuthClientProvider> | null = null;

  private async loadProvider(): Promise<AuthClientProvider> {
    if (this.provider) return this.provider;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const providerName = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

      switch (providerName) {
        case "better-auth": {
          const { BetterAuthClient } = await import("./providers/better-auth/client");
          this.provider = new BetterAuthClient();
          break;
        }
        case "next-auth": {
          const { NextAuthClient } = await import("./providers/next-auth/client");
          this.provider = new NextAuthClient();
          break;
        }
        case "authkit": {
          const { AuthKitClient } = await import("./providers/authkit/client");
          this.provider = new AuthKitClient();
          break;
        }
        case "clerk-dev": { 
          const { getClientInstance } = await import("./providers/clerk-dev/client");
          this.provider = getClientInstance();
          break;
        }
        default:
          throw new Error(`Unknown auth provider: ${providerName}`);
      }

      this.loading = null;
      return this.provider;
    })();

    return this.loading;
  }

  async signInEmail(params: { email: string; password: string }): Promise<SignInResult> {
    const provider = await this.loadProvider();    
    return provider.signInEmail(params);
  }

  async signUpEmail(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<SignUpResult> {
    const provider = await this.loadProvider();    
    const result = await provider.signUpEmail(params);
    
    return result;
  }

  async signOut(): Promise<SignOutResult> {
    const provider = await this.loadProvider();
    return provider.signOut();
  }

  async getSession(): Promise<GetSessionResult> {
    const provider = await this.loadProvider();
    return provider.getSession();
  }

  useSession(): UseSessionResult {
    const providerName = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
    
    try {
      switch (providerName) {
        case "better-auth": {
          const { useSession } = require("./providers/better-auth/client");
          return useSession();
        }
        case "next-auth": {
          const { useSession } = require("./providers/next-auth/client");
          return useSession();
        }
        case "authkit": {
          const { useSession } = require("./providers/authkit/client");
          return useSession();
        }
        case "clerk-dev": {
          const { useSession } = require("./providers/clerk-dev/client");
          return useSession();
        }
        default:
          throw new Error(`Unknown auth provider: ${providerName}`);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);

      if (errorMessage.includes("ClerkProvider") || errorMessage.includes("useAuth")) {
        return {
          data: null,
          isLoading: false,
        };
      }
      
      return {
        data: null,
        isLoading: false,
      };
    }
  }

  async getBaseClient() {
    const provider = await this.loadProvider();
    if (provider.getBaseClient) {
      return provider.getBaseClient();
    }
    return null;
  }
}

const baseClient = new BaseAuthClient();

export const signIn = {
  email: (params: { email: string; password: string }) => baseClient.signInEmail(params),
};

export const signUp = {
  email: (params: { email: string; password: string; name: string }) =>
    baseClient.signUpEmail(params),
};

export const signOut = () => baseClient.signOut();
export const getSession = () => baseClient.getSession();
export const useSession = () => baseClient.useSession();
export const getBaseClient = () => baseClient.getBaseClient();

