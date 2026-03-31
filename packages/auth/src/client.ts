/**
 * @repo/auth/client - Better Auth client implementation
 *
 * Direct export - no dynamic provider switching.
 */
"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

import type {
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
  RequestPasswordResetParams,
  RequestPasswordResetResult,
  ResetPasswordParams,
  ResetPasswordResult,
  SignInSocialParams,
  UnifiedSession,
  UnifiedUser,
} from "./types";

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

// Get auth config from environment
function getAuthConfig() {
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:8801");

  return { baseURL };
}

class BetterAuthClient {
  private client;

  constructor() {
    const config = getAuthConfig();

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

// Singleton instance
let clientInstance: BetterAuthClient | null = null;

function getClientInstance(): BetterAuthClient {
  if (!clientInstance) {
    clientInstance = new BetterAuthClient();
  }
  return clientInstance;
}

// Convenience exports
export const signIn = {
  email: (params: { email: string; password: string }) =>
    getClientInstance().signInEmail(params),
  social: (params: SignInSocialParams) =>
    getClientInstance().signInSocial(params),
};

export const signUp = {
  email: (params: { email: string; password: string; name: string }) =>
    getClientInstance().signUpEmail(params),
};

export const signOut = () => getClientInstance().signOut();
export const getSession = () => getClientInstance().getSession();
export const useSession = () => getClientInstance().useSession();
export const getBaseClient = () => getClientInstance().getBaseClient();

export const forgotPassword = {
  request: (params: RequestPasswordResetParams) =>
    getClientInstance().requestPasswordReset(params),
  reset: (params: ResetPasswordParams) =>
    getClientInstance().resetPassword(params),
};

// Organization convenience exports
// These proxy to the BetterAuth organization plugin methods on the client.
export const organizationMethods = {
  createInvitation: (params: {
    email: string;
    role: "member" | "admin";
    organizationId: string;
  }) =>
    getClientInstance().getBaseClient().organization.inviteMember({
      email: params.email,
      role: params.role,
      organizationId: params.organizationId,
    }),

  cancelInvitation: (params: { invitationId: string }) =>
    getClientInstance().getBaseClient().organization.cancelInvitation({
      invitationId: params.invitationId,
    }),

  acceptInvitation: (params: { invitationId: string }) =>
    getClientInstance().getBaseClient().organization.acceptInvitation({
      invitationId: params.invitationId,
    }),

  rejectInvitation: (params: { invitationId: string }) =>
    getClientInstance().getBaseClient().organization.rejectInvitation({
      invitationId: params.invitationId,
    }),

  getInvitation: (params: { id: string }) =>
    getClientInstance()
      .getBaseClient()
      .organization.getInvitation({
        query: { id: params.id },
      }),

  removeMember: (params: {
    memberIdOrEmail: string;
    organizationId: string;
  }) =>
    getClientInstance().getBaseClient().organization.removeMember({
      memberIdOrEmail: params.memberIdOrEmail,
      organizationId: params.organizationId,
    }),

  updateMemberRole: (params: {
    memberId: string;
    role: "member" | "admin" | "owner";
    organizationId: string;
  }) =>
    getClientInstance().getBaseClient().organization.updateMemberRole({
      memberId: params.memberId,
      role: params.role,
      organizationId: params.organizationId,
    }),

  setActiveOrganization: (params: { organizationId: string }) =>
    getClientInstance().getBaseClient().organization.setActive({
      organizationId: params.organizationId,
    }),

  getFullOrganization: (params: { query?: { organizationId?: string } } = {}) =>
    getClientInstance()
      .getBaseClient()
      .organization.getFullOrganization(params),

  listInvitations: (params: { query: { organizationId: string } }) =>
    getClientInstance()
      .getBaseClient()
      .organization.getFullOrganization(params),

  /** Returns pending invitations for the current user across all orgs */
  listUserInvitations: () =>
    getClientInstance().getBaseClient().organization.listInvitations(),

  leaveOrganization: (params: { organizationId: string }) =>
    getClientInstance()
      .getBaseClient()
      .organization.leave({ organizationId: params.organizationId }),
};

// Re-export the reactive hook for active organization
export const useActiveOrganization = () =>
  getClientInstance().getBaseClient().useActiveOrganization();

export const useListOrganizations = () =>
  getClientInstance().getBaseClient().useListOrganizations();
