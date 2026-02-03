import "server-only";

import { authkit } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import { NextRequest } from "next/server";
import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq } from "/database";
import { getAuthConfig } from "../../config";
import { mapAuthKitSession } from "../../utils/schema-mapper";
import type {
  AuthServerProvider,
  UnifiedSession,
  SignInResult,
  SignUpResult,
  SignOutResult,
} from "../../types";

export class AuthKitServer implements AuthServerProvider {
  private workos: WorkOS;
  private config: {
    apiKey: string;
    clientId: string;
    cookiePassword: string;
    baseURL: string;
  };

  constructor() {
    const config = getAuthConfig("authkit") as {
      apiKey: string;
      clientId: string;
      cookiePassword: string;
      baseURL: string;
    };
    
    if (!config.apiKey || !config.clientId || !config.cookiePassword) {
      throw new Error("AuthKit configuration is incomplete. Missing required environment variables.");
    }
    
    this.config = config;
    this.workos = new WorkOS(this.config.apiKey);
  }

  async getSession(headers: Headers): Promise<UnifiedSession | null> {
    try {
      const url = this.config.baseURL || "http://localhost:3000";
      const request = new Request(url, {
        headers: headers,
      });

      const { session } = await authkit(request as NextRequest);

      if (!session || !session.user) {
        return null;
      }

      return mapAuthKitSession({
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName || null,
        lastName: session.user.lastName || null,
        profilePictureUrl: session.user.profilePictureUrl || null,
      });
    } catch (error) {
      return null;
    }
  }

  getApiHandler() {
    return {
      GET: async (req: Request) => {
        return new Response(
          JSON.stringify({ error: "AuthKit uses redirect-based authentication" }),
          {
            status: 405,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
      POST: async (req: Request) => {
        return new Response(
          JSON.stringify({ error: "AuthKit uses redirect-based authentication" }),
          {
            status: 405,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
    };
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      const localUsers = await db()
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, params.email))
        .limit(1);

      if (localUsers.length > 0) {
        const localUser = localUsers[0];
        
        try {
          await this.workos.userManagement.getUser(localUser.id);
        } catch (error: any) {
          if (error?.code === "user_not_found" || error?.statusCode === 404) {
            const [firstName, ...lastNameParts] = (localUser.name || "").split(" ");
            const lastName = lastNameParts.join(" ") || null;

            try {
              await this.workos.userManagement.createUser({
                email: localUser.email,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                password: params.password,
              });
            } catch (createError: any) {
              if (createError?.code !== "user_already_exists") {
                throw createError;
              }
            }
          } else {
            throw error;
          }
        }
      }

      const response = await this.workos.userManagement.authenticateWithPassword({
        email: params.email,
        password: params.password,
        clientId: this.config.clientId,
        session: {
          sealSession: true,
          cookiePassword: this.config.cookiePassword,
        },
      });

      if (response.user) {
        const session = mapAuthKitSession(response.user);
        return {
          data: session || undefined,
        };
      }

      return {
        error: {
          message: "Authentication failed",
        },
      };
    } catch (error: any) {
      if (error?.code === "invalid_credentials" || error?.code === "invalid_password") {
        return {
          error: {
            message: "Invalid email or password",
            code: error?.code,
          },
        };
      }
      
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
      const [firstName, ...lastNameParts] = params.name.split(" ");
      const lastName = lastNameParts.join(" ") || null;

      const user = await this.workos.userManagement.createUser({
        email: params.email,
        password: params.password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      if (user) {
        const session = mapAuthKitSession({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePictureUrl: user.profilePictureUrl,
        });

        return {
          data: session || undefined,
        };
      }

      return {
        error: {
          message: "Failed to create user",
        },
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

  getAuthInstance() {
    return this.workos;
  }
}

