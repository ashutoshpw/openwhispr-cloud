/**
 * @repo/auth/server - Better Auth server implementation (OpenWhispr Cloud)
 *
 * Single auth server on auth.openwhispr.com. Issues bearer tokens to the
 * desktop client (set-auth-token rotation) and cookie sessions to the web
 * properties (www / notes / admin) via a cross-subdomain session cookie.
 */
import "server-only";

import { passkey } from "@better-auth/passkey";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import * as schema from "@repo/database/schema";
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { toNextJsHandler } from "better-auth/next-js";
import {
  bearer,
  oidcProvider,
  organization,
  twoFactor,
} from "better-auth/plugins";

import type { UnifiedSession, UnifiedUser } from "./types";

const SESSION_COOKIE_PREFIX = "openwhispr";

function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

function cookieDomain(): string | undefined {
  if (!isProduction()) return undefined;
  // Shared across api/auth/www/notes/admin subdomains for the desktop
  // cookie-fallback probe and dashboard sessions.
  return process.env.AUTH_COOKIE_DOMAIN ?? ".openwhispr.com";
}

function trustedOrigins(): string[] {
  const defaults = [
    "https://openwhispr.com",
    "https://www.openwhispr.com",
    "https://api.openwhispr.com",
    "https://notes.openwhispr.com",
    "https://admin.openwhispr.com",
    "http://localhost:8801",
    "http://localhost:8802",
    "http://localhost:8804",
    "http://localhost:8805",
    "http://localhost:8806",
  ];
  const extra = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...defaults, ...extra];
}

// Session mapper
function normalizeUser(user: {
  id: string;
  email: string;
  publicEmail?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
}): UnifiedUser {
  return {
    id: user.id,
    email: user.publicEmail ?? user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role ?? null,
  };
}

function mapBetterAuthSession(
  session:
    | {
        user?: {
          id: string;
          email: string;
          name?: string | null;
          image?: string | null;
          role?: string | null;
        } | null;
        expiresAt?: Date;
      }
    | null
    | undefined,
): UnifiedSession | null {
  if (!session || !session.user) {
    return null;
  }

  return {
    user: normalizeUser(session.user),
    expiresAt:
      session.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

// Read admin domains from environment variable
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

// Get auth config from environment
function getAuthConfig() {
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_AUTH_URL ||
    (process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL);
  const secret =
    process.env.BETTER_AUTH_SECRET || "development-secret-change-me";

  return {
    baseURL: baseURL
      ? baseURL.startsWith("http")
        ? baseURL
        : `https://${baseURL}`
      : "http://localhost:8803",
    secret,
  };
}

class BetterAuthServer {
  private authInstance;

  constructor(options?: BetterAuthServerOptions) {
    const config = getAuthConfig();

    this.authInstance = betterAuth({
      appName: "OpenWhispr",
      database: drizzleAdapter(db(), {
        provider: "pg",
        schema,
      }),
      secret: config.secret,
      baseURL: config.baseURL,
      trustedOrigins: trustedOrigins(),
      advanced: {
        cookiePrefix: SESSION_COOKIE_PREFIX,
        defaultCookieAttributes: {
          domain: cookieDomain(),
          // Desktop webviews and cross-subdomain dashboard calls need the
          // cookie on XHRs from other origins.
          sameSite: "none",
          secure: isProduction(),
          partitioned: isProduction(),
        },
      },
      rateLimit: {
        enabled: true,
        window: 60,
        max: 100,
      },
      databaseHooks: {
        session: {
          create: {
            before: async (sessionData) => {
              const userId = (sessionData as { userId?: string })?.userId;
              if (!userId) return;
              const [row] = await db()
                .select({ archivedAt: schema.user.archivedAt })
                .from(schema.user)
                .where(eq(schema.user.id, userId))
                .limit(1);
              if (row?.archivedAt) {
                throw new APIError("UNAUTHORIZED", {
                  code: "ACCOUNT_ARCHIVED",
                  message:
                    "This account has been suspended. Reach out to support if you think this is an error.",
                });
              }
              return { data: { ...sessionData } };
            },
          },
        },
        user: {
          create: {
            before: async (userData) => {
              const email = (userData as { email?: string }).email ?? "";
              return {
                data: {
                  ...userData,
                  publicEmail: email,
                },
              };
            },
          },
        },
      },
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        minPasswordLength: 8,
        autoSignIn: true,
        resetPasswordTokenExpiresIn: 3600,
        sendResetPassword: async ({ user, url, token }) => {
          if (options?.checkPasswordResetRateLimit) {
            const rateLimit = await options.checkPasswordResetRateLimit(
              user.email,
            );
            if (!rateLimit.success) {
              console.log(
                `[Auth] Password reset rate limited for ${user.email}`,
              );
              return;
            }
          }

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
      socialProviders: {
        ...(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
        ...(process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID &&
        process.env.MICROSOFT_CLIENT_SECRET
          ? {
              microsoft: {
                clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
              },
            }
          : {}),
        ...(process.env.NEXT_PUBLIC_APPLE_CLIENT_ID &&
        process.env.APPLE_CLIENT_SECRET
          ? {
              apple: {
                clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
                clientSecret: process.env.APPLE_CLIENT_SECRET,
              },
            }
          : {}),
      },
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
      },
      plugins: [
        nextCookies(),
        // Issues session tokens as Authorization bearer tokens (set-auth-token
        // response header) — the desktop client's only credential transport.
        bearer(),
        organization(),
        twoFactor(),
        passkey({
          rpName: "OpenWhispr",
          rpID: process.env.PASSKEY_RP_ID,
          origin:
            process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
        }),
        oidcProvider({
          loginPage: "/auth/sign-in",
          consentPage: "/consent",
          allowDynamicClientRegistration: true,
        }),
      ],
    });
  }

  async getSession(headers: Headers): Promise<UnifiedSession | null> {
    const session = await this.authInstance.api.getSession({ headers });
    if (!session) return null;
    const userId = session.user?.id;
    if (userId) {
      const [row] = await db()
        .select({
          archivedAt: schema.user.archivedAt,
          publicEmail: schema.user.publicEmail,
        })
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .limit(1);
      if (row?.archivedAt) return null;
      if (row && session.user) {
        session.user.email = row.publicEmail ?? session.user.email;
      }
    }
    return mapBetterAuthSession(session);
  }

  getApiHandler() {
    return toNextJsHandler(this.authInstance.handler);
  }

  getAuthInstance() {
    return this.authInstance;
  }

  async signInEmail(params: { email: string; password: string }) {
    try {
      const ctx = await this.authInstance.api.signInEmail({
        body: {
          email: params.email,
          password: params.password,
        },
      });
      return { data: ctx, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : "Failed to sign in",
          code: "SIGN_IN_FAILED",
        },
      };
    }
  }

  async signInEmailResponse(params: {
    email: string;
    password: string;
    headers?: Headers;
  }): Promise<Response> {
    return this.authInstance.api.signInEmail({
      body: {
        email: params.email,
        password: params.password,
      },
      asResponse: true,
    });
  }

  async signUpEmail(params: { email: string; password: string; name: string }) {
    try {
      const ctx = await this.authInstance.api.signUpEmail({
        body: {
          email: params.email,
          password: params.password,
          name: params.name,
        },
      });
      return { data: ctx, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : "Failed to sign up",
          code: "SIGN_UP_FAILED",
        },
      };
    }
  }

  async signUpEmailResponse(params: {
    email: string;
    password: string;
    name: string;
    headers?: Headers;
  }): Promise<Response> {
    return this.authInstance.api.signUpEmail({
      body: {
        email: params.email,
        password: params.password,
        name: params.name,
      },
      asResponse: true,
    });
  }

  async signOut() {
    try {
      return { error: null };
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Failed to sign out",
          code: "SIGN_OUT_FAILED",
        },
      };
    }
  }

  async assignSiteAdminRoleIfEligible(params: {
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

// Singleton instance
let serverInstance: BetterAuthServer | null = null;

export function getBetterAuthServer(
  options?: BetterAuthServerOptions,
): BetterAuthServer {
  if (!serverInstance) {
    serverInstance = new BetterAuthServer(options);
  }
  return serverInstance;
}

// Convenience exports
export const auth = {
  api: {
    getSession: async (options: { headers: Headers }) => {
      const server = getBetterAuthServer();
      return server.getSession(options.headers);
    },
  },
};

export async function getSession(
  headers: Headers,
): Promise<UnifiedSession | null> {
  const server = getBetterAuthServer();
  return server.getSession(headers);
}

// Export mapper for use in other modules
export { mapBetterAuthSession };

// Export baseServer singleton for API routes
export const baseServer = {
  getApiHandler: async () => {
    const server = getBetterAuthServer();
    return server.getApiHandler();
  },
  signInEmail: async (params: { email: string; password: string }) => {
    const server = getBetterAuthServer();
    return server.signInEmail(params);
  },
  signInEmailResponse: async (params: {
    email: string;
    password: string;
    headers?: Headers;
  }) => {
    const server = getBetterAuthServer();
    return server.signInEmailResponse(params);
  },
  signUpEmail: async (params: {
    email: string;
    password: string;
    name: string;
  }) => {
    const server = getBetterAuthServer();
    return server.signUpEmail(params);
  },
  signUpEmailResponse: async (params: {
    email: string;
    password: string;
    name: string;
    headers?: Headers;
  }) => {
    const server = getBetterAuthServer();
    return server.signUpEmailResponse(params);
  },
  signOut: async () => {
    const server = getBetterAuthServer();
    return server.signOut();
  },
  getSession: async (headers: Headers) => {
    const server = getBetterAuthServer();
    return server.getSession(headers);
  },
};
