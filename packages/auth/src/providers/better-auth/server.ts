/**
 * @repo/auth/better-auth/server - BetterAuth server implementation
 * Import via: import { BetterAuthServer, auth } from "@repo/auth/better-auth/server"
 *
 * This module is only loaded when you explicitly import it, enabling tree-shaking.
 */
import "server-only";

import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq } from "@repo/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { toNextJsHandler } from "better-auth/next-js";
import bcrypt from "bcryptjs";

import { getAuthConfig } from "../../config";
import { mapBetterAuthSession } from "../../utils";
import type {
  AuthServerProvider,
  UnifiedSession,
  SignInResult,
  SignUpResult,
  SignOutResult,
} from "../../types";

// Read admin domains from environment variable
// Format: ADMIN_EMAIL_DOMAINS=domain1.com,domain2.io
function getSiteAdminDomains(): Set<string> {
  const domainsEnv = process.env.ADMIN_EMAIL_DOMAINS;
  if (!domainsEnv) return new Set();

  return new Set(
    domainsEnv
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  );
}

const SITE_ADMIN_DOMAINS = getSiteAdminDomains();

export interface BetterAuthServerOptions {
  sendPasswordResetEmail?: (params: {
    user: { email: string };
    url: string;
    token: string;
  }) => Promise<void>;
  checkPasswordResetRateLimit?: (
    email: string,
  ) => Promise<{ success: boolean }>;
}

export class BetterAuthServer implements AuthServerProvider {
  private authInstance;

  constructor(options?: BetterAuthServerOptions) {
    const config = getAuthConfig("better-auth");

    this.authInstance = betterAuth({
      database: drizzleAdapter(db(), {
        provider: "pg",
        schema,
      }),
      secret: config.secret,
      baseURL: config.baseURL,
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        minPasswordLength: 8,
        autoSignIn: true,
        resetPasswordTokenExpiresIn: 3600, // 1 hour
        sendResetPassword: async ({ user, url, token }) => {
          // Check rate limit before sending if provided
          if (options?.checkPasswordResetRateLimit) {
            const rateLimit = await options.checkPasswordResetRateLimit(
              user.email,
            );
            if (!rateLimit.success) {
              console.log(
                `[Auth] Password reset rate limited for ${user.email}`,
              );
              // Still return success to prevent email enumeration
              return;
            }
          }

          // Send the password reset email if handler provided
          if (options?.sendPasswordResetEmail) {
            void options.sendPasswordResetEmail({
              user: { email: user.email },
              url,
              token,
            });
          } else {
            console.log(
              `[Auth] Password reset requested for ${user.email}: ${url}`,
            );
          }
        },
        password: {
          hash: async (password) => {
            return await bcrypt.hash(password, 10);
          },
          verify: async ({ hash, password }) => {
            return await bcrypt.compare(password, hash);
          },
        },
      },
      // Google OAuth - only enabled if credentials are configured
      ...(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET && {
          socialProviders: {
            google: {
              clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          },
        }),
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
      },
      plugins: [nextCookies(), organization()],
    });
  }

  async getSession(headers: Headers): Promise<UnifiedSession | null> {
    const session = await this.authInstance.api.getSession({ headers });
    if (!session) return null;
    return mapBetterAuthSession(session);
  }

  getApiHandler() {
    return toNextJsHandler(this.authInstance.handler);
  }

  getAuthInstance() {
    return this.authInstance;
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      const result = await this.authInstance.api.signInEmail({
        body: params,
      });
      if (result && "user" in result) {
        const mappedSession = mapBetterAuthSession(
          result as {
            user: {
              id: string;
              email: string;
              name?: string | null;
              image?: string | null;
              role?: string | null;
            };
            expiresAt?: Date;
          },
        );
        return {
          data: mappedSession || undefined,
        };
      }
      return {
        data: undefined,
      };
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      return {
        error: {
          message: err?.message || "Failed to sign in",
          code: err?.code,
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
      const result = await this.authInstance.api.signUpEmail({
        body: params,
      });
      if (result && "user" in result) {
        const mappedSession = mapBetterAuthSession(
          result as {
            user: {
              id: string;
              email: string;
              name?: string | null;
              image?: string | null;
              role?: string | null;
            };
            expiresAt?: Date;
          },
        );
        const userId = (result as { user?: { id?: string } })?.user?.id;
        if (userId && mappedSession) {
          await this.assignSiteAdminRoleIfEligible({
            email: params.email,
            userId,
            mappedSession,
          });
        }
        return {
          data: mappedSession || undefined,
        };
      }
      return {
        data: undefined,
      };
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      return {
        error: {
          message: err?.message || "Failed to sign up",
          code: err?.code,
        },
      };
    }
  }

  async signOut(): Promise<SignOutResult> {
    return {};
  }

  private async assignSiteAdminRoleIfEligible(params: {
    email: string;
    userId?: string;
    mappedSession?: UnifiedSession | null;
  }) {
    const domain = params.email.split("@")[1]?.toLowerCase() ?? "";
    if (!params.userId || !SITE_ADMIN_DOMAINS.has(domain)) {
      return;
    }

    await db()
      .update(schema.user)
      .set({ role: "site-admin" })
      .where(eq(schema.user.id, params.userId));

    if (params.mappedSession?.user) {
      params.mappedSession.user.role = "site-admin";
    }
  }
}

// Singleton instance for convenience
let serverInstance: BetterAuthServer | null = null;

export function getBetterAuthServer(
  options?: BetterAuthServerOptions,
): BetterAuthServer {
  if (!serverInstance) {
    serverInstance = new BetterAuthServer(options);
  }
  return serverInstance;
}

// Convenience exports for direct usage
export const auth = {
  api: {
    getSession: async (options: { headers: Headers }) => {
      const server = getBetterAuthServer();
      return server.getSession(options.headers);
    },
  },
};
