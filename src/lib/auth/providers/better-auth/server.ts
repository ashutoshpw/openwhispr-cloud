import "server-only";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuthConfig } from "../../config";
import { mapBetterAuthSession } from "../../utils/schema-mapper";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type {
  AuthServerProvider,
  UnifiedSession,
  SignInResult,
  SignUpResult,
  SignOutResult,
} from "../../types";

const SITE_ADMIN_DOMAINS = new Set([
  "w3dev",
  "w3dev.email",
  "w3dev.in",
  "w3devemail.com",
]);

export class BetterAuthServer implements AuthServerProvider {
  private authInstance;

  constructor() {
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
        password: {
          hash: async (password) => {
            return await bcrypt.hash(password, 10);
          },
          verify: async ({ hash, password }) => {
            return await bcrypt.compare(password, hash);
          },
        },
      },
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

  async signInEmail(params: { email: string; password: string }): Promise<SignInResult> {
    try {
      const result = await this.authInstance.api.signInEmail({
        body: params,
      });
      if (result && 'user' in result) {
        const mappedSession = mapBetterAuthSession(result as any);
        return {
          data: mappedSession || undefined,
        };
      }
      return {
        data: undefined,
      };
    } catch (error: any) {
      return {
        error: {
          message: error?.message || "Failed to sign in",
          code: error?.code,
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
      if (result && 'user' in result) {
        const mappedSession = mapBetterAuthSession(result as any);
        await this.assignSiteAdminRoleIfEligible({
          email: params.email,
          userId: (result as any)?.user?.id,
          mappedSession,
        });
        return {
          data: mappedSession || undefined,
        };
      }
      return {
        data: undefined,
      };
    } catch (error: any) {
      return {
        error: {
          message: error?.message || "Failed to sign up",
          code: error?.code,
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
