import "server-only";

import type { AuthServerProvider, UnifiedSession } from "./types";

class BaseAuthServer {
  private provider: AuthServerProvider | null = null;
  private loading: Promise<AuthServerProvider> | null = null;

  private async loadProvider(): Promise<AuthServerProvider> {
    if (this.provider) return this.provider;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const providerName = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

      let provider: AuthServerProvider;

      switch (providerName) {
        case "better-auth": {
          const { BetterAuthServer } = await import("./providers/better-auth/server");
          provider = new BetterAuthServer();
          break;
        }
        case "next-auth": {
          const { NextAuthServer } = await import("./providers/next-auth/server");
          provider = new NextAuthServer();
          break;
        }
        case "authkit": {
          const { AuthKitServer } = await import("./providers/authkit/server");
          provider = new AuthKitServer();
          break;
        }
        case "clerk-dev": {
          const { ClerkServer } = await import("./providers/clerk-dev/server");
          provider = new ClerkServer();
          break;
        }
        default:
          throw new Error(`Unknown auth provider: ${providerName}`);
      }

      this.provider = provider;
      this.loading = null;
      return provider;
    })();

    return this.loading;
  }

  async getSession(headers: Headers): Promise<UnifiedSession | null> {
    const provider = await this.loadProvider();
    return provider.getSession(headers);
  }

  async getApiHandler() {
    const provider = await this.loadProvider();
    return provider.getApiHandler();
  }

  async getAuthInstance() {
    const provider = await this.loadProvider();
    if (provider.getAuthInstance) {
      return provider.getAuthInstance();
    }
    return null;
  }

  async signInEmail(params: { email: string; password: string }) {
    const provider = await this.loadProvider();
    if (provider.signInEmail) {
      return provider.signInEmail(params);
    }
    throw new Error("Provider does not support signInEmail");
  }

  async signUpEmail(params: { email: string; password: string; name: string }) {
    const provider = await this.loadProvider();
    if (provider.signUpEmail) {
      return provider.signUpEmail(params);
    }
    throw new Error("Provider does not support signUpEmail");
  }

  async signOut() {
    const provider = await this.loadProvider();
    if (provider.signOut) {
      return provider.signOut();
    }
    throw new Error("Provider does not support signOut");
  }
}

const baseServer = new BaseAuthServer();

export const auth = {
  api: {
    getSession: async (options: { headers: Headers }) => {
      return baseServer.getSession(options.headers);
    },
  },
};

export { baseServer };

export type { UnifiedSession, AuthError, UnifiedUser } from "./types";
