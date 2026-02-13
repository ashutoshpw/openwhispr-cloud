/**
 * @repo/auth/client - Clerk client implementation
 */
"use client";

import { useEffect } from "react";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";

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
  UnifiedSession,
  UnifiedUser,
} from "./types";

// Get auth config from environment
function getAuthConfig() {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { baseURL };
}

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

export function mapClerkSession(user: {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}): UnifiedSession {
  const primaryEmail = user.emailAddresses[0]?.emailAddress || "";
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    primaryEmail.split("@")[0];

  return {
    user: normalizeUser({
      id: user.id,
      email: primaryEmail,
      name,
      image: user.imageUrl,
      role: null,
    }),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

// Clerk client type
interface ClerkClientType {
  client?: {
    signIn: {
      create: (params: {
        strategy: string;
        identifier: string;
        password: string;
      }) => Promise<{ status: string }>;
    };
    signUp: {
      create: (params: {
        emailAddress: string;
        password: string;
        firstName?: string;
        lastName?: string;
      }) => Promise<{
        status: string;
        missingFields?: string[];
        unverifiedFields?: string[];
      }>;
    };
  };
  signIn?: {
    create: (params: {
      strategy: string;
      identifier: string;
      password: string;
    }) => Promise<{ status: string }>;
  };
  signUp?: {
    create: (params: {
      emailAddress: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => Promise<{
      status: string;
      missingFields?: string[];
      unverifiedFields?: string[];
    }>;
  };
  signOut?: () => Promise<void>;
}

// Global Clerk client reference
let globalClerkClientRef: ClerkClientType | null = null;

export function setGlobalClerkClient(client: ClerkClientType) {
  globalClerkClientRef = client;
}

// Sign-in helper
async function clerkSignInEmail(
  clerkClient: ClerkClientType,
  params: { email: string; password: string },
): Promise<SignInResult> {
  try {
    if (!clerkClient) {
      return {
        error: {
          message:
            "Clerk client is not available. Make sure ClerkProvider is configured.",
          code: "CLERK_NOT_AVAILABLE",
        },
      };
    }

    const client = clerkClient.client || clerkClient;
    const signIn = client.signIn;
    if (!signIn) {
      return {
        error: {
          message: "Clerk signIn method is not available.",
          code: "SIGNIN_NOT_AVAILABLE",
        },
      };
    }

    const signInAttempt = await signIn.create({
      strategy: "password",
      identifier: params.email,
      password: params.password,
    });

    if (signInAttempt.status === "complete") {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { data: undefined };
    }

    if (signInAttempt.status === "needs_first_factor") {
      return {
        error: {
          message: "Additional verification required",
          code: "NEEDS_FIRST_FACTOR",
        },
      };
    }

    if (signInAttempt.status === "needs_second_factor") {
      return {
        error: {
          message: "Two-factor authentication required",
          code: "NEEDS_SECOND_FACTOR",
        },
      };
    }

    return {
      error: {
        message: "Sign-in failed. Please check your credentials.",
        code: "SIGN_IN_FAILED",
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    return {
      error: {
        message: err?.message || "Failed to sign in",
        code: err?.code || "SIGN_IN_ERROR",
      },
    };
  }
}

// Sign-up helper
async function clerkSignUpEmail(
  clerkClient: ClerkClientType,
  params: { email: string; password: string; name: string },
): Promise<SignUpResult> {
  try {
    if (!clerkClient) {
      return {
        error: {
          message:
            "Clerk client is not available. Make sure ClerkProvider is configured.",
          code: "CLERK_NOT_AVAILABLE",
        },
      };
    }

    const nameParts = params.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const client = clerkClient.client || clerkClient;
    const signUp = client.signUp;

    if (!signUp) {
      return {
        error: {
          message: "Clerk signUp method is not available.",
          code: "SIGNUP_NOT_AVAILABLE",
        },
      };
    }

    const signUpAttempt = await signUp.create({
      emailAddress: params.email,
      password: params.password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });

    if (signUpAttempt.status === "complete") {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { data: undefined };
    }

    if (signUpAttempt.status === "missing_requirements") {
      const missingFields = signUpAttempt.missingFields || [];
      const unverifiedFields = signUpAttempt.unverifiedFields || [];

      let errorMessage = "Missing required information for sign-up";

      if (unverifiedFields.includes("email_address")) {
        errorMessage =
          "Email verification is required. Please check your email.";
      } else if (missingFields.length > 0) {
        errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
      }

      return {
        error: {
          message: errorMessage,
          code: "MISSING_REQUIREMENTS",
          details: { missingFields, unverifiedFields },
        },
      };
    }

    return {
      error: {
        message: "Sign-up failed. Please try again.",
        code: "SIGN_UP_FAILED",
      },
    };
  } catch (error: unknown) {
    const err = error as {
      errors?: Array<{ message?: string; code?: string }>;
      message?: string;
      code?: string;
    };
    if (err?.errors) {
      const clerkError = err.errors[0];
      return {
        error: {
          message: clerkError?.message || "Failed to sign up",
          code: clerkError?.code || "SIGN_UP_ERROR",
        },
      };
    }
    return {
      error: {
        message: err?.message || "Failed to sign up",
        code: err?.code || "SIGN_UP_ERROR",
      },
    };
  }
}

// Client class
class ClerkClient {
  private baseURL: string;
  private clerkClientRef: ClerkClientType | null = null;

  constructor() {
    const config = getAuthConfig();
    this.baseURL = config.baseURL;

    if (typeof window !== "undefined") {
      this.clerkClientRef = globalClerkClientRef;
    }
  }

  setClerkClient(client: ClerkClientType) {
    this.clerkClientRef = client;
    globalClerkClientRef = client;
  }

  async signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    try {
      // Try server-side first
      try {
        const serverResponse = await fetch(
          `${this.baseURL}/api/auth/sign-in/email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(params),
          },
        );

        const serverResult = await serverResponse.json();

        if (serverResult.data && !serverResult.error) {
          const clerkClient =
            this.clerkClientRef ||
            (typeof window !== "undefined"
              ? (window as { __clerk_client__?: ClerkClientType })
                  .__clerk_client__
              : null);

          if (clerkClient) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            const result = await clerkSignInEmail(clerkClient, params);
            if (result.data || result.error?.code !== "SIGN_IN_FAILED") {
              return result;
            }
          }
          return { data: serverResult.data };
        }

        if (
          serverResult.error &&
          serverResult.error.code !== "INVALID_CREDENTIALS"
        ) {
          return { error: serverResult.error };
        }
      } catch {
        // Server-side failed, fall through to client-side
      }

      // Client-side sign-in
      const clerkClient =
        this.clerkClientRef ||
        (typeof window !== "undefined"
          ? (window as { __clerk_client__?: ClerkClientType }).__clerk_client__
          : null);

      if (clerkClient) {
        return await clerkSignInEmail(clerkClient, params);
      }

      return {
        error: {
          message: "Clerk sign-in requires client context.",
          code: "CLIENT_CONTEXT_REQUIRED",
        },
      };
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      return {
        error: {
          message: err?.message || "Failed to sign in",
          code: err?.code || "SIGN_IN_ERROR",
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
      const clerkClient =
        this.clerkClientRef ||
        globalClerkClientRef ||
        (typeof window !== "undefined"
          ? (window as { __clerk_client__?: ClerkClientType }).__clerk_client__
          : null);

      if (clerkClient) {
        const result = await clerkSignUpEmail(clerkClient, params);

        if (result.data !== undefined && !result.error) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const session = await this.getSession();
          if (session.data) {
            return { data: session.data };
          }
        }

        return result;
      }

      return {
        error: {
          message: "Clerk sign-up requires ClerkProvider context.",
          code: "CLERK_PROVIDER_REQUIRED",
        },
      };
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      return {
        error: {
          message: err?.message || "Failed to sign up",
          code: err?.code || "SIGN_UP_ERROR",
        },
      };
    }
  }

  async signOut(): Promise<SignOutResult> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: {
            message: errorData.error?.message || "Failed to sign out",
            code: errorData.error?.code || "SIGN_OUT_ERROR",
          },
        };
      }

      return {};
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      return {
        error: {
          message: err?.message || "Failed to sign out",
          code: err?.code || "SIGN_OUT_ERROR",
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
          error: { message: result.error.message || "Failed to get session" },
        };
      }

      return { data: result.data || undefined };
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Failed to get session",
        },
      };
    }
  }

  async requestPasswordReset(
    _params: RequestPasswordResetParams,
  ): Promise<RequestPasswordResetResult> {
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in#/forgot-password";
    }
    return { success: true };
  }

  async resetPassword(
    _params: ResetPasswordParams,
  ): Promise<ResetPasswordResult> {
    return {
      error: {
        message: "Password reset is handled by Clerk's hosted UI.",
        code: "CLERK_HOSTED_UI",
      },
    };
  }

  getBaseClient() {
    return null;
  }
}

// Singleton instance
let clientInstance: ClerkClient | null = null;

function getClientInstance(): ClerkClient {
  if (!clientInstance) {
    clientInstance = new ClerkClient();
  }
  return clientInstance;
}

// Hooks
export function useClerkClient() {
  const clerk = useClerk();
  const client = getClientInstance();

  if (clerk && client) {
    client.setClerkClient(clerk as unknown as ClerkClientType);
    setGlobalClerkClient(clerk as unknown as ClerkClientType);
  }

  return client;
}

export function useInitializeClerkClient() {
  const clerk = useClerk();

  useEffect(() => {
    if (clerk) {
      setGlobalClerkClient(clerk as unknown as ClerkClientType);
      const client = getClientInstance();
      client.setClerkClient(clerk as unknown as ClerkClientType);
    }
  }, [clerk]);

  return clerk;
}

export const useSession = (): UseSessionResult => {
  const { isLoaded: authLoaded, userId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  const isLoading = !authLoaded || !userLoaded;

  if (isLoading) {
    return { data: null, isLoading: true };
  }

  if (!user || !userId) {
    return { data: null, isLoading: false };
  }

  const session = mapClerkSession(user);
  return { data: session, isLoading: false };
};

// Convenience exports
export const signIn = {
  email: (params: { email: string; password: string }) =>
    getClientInstance().signInEmail(params),
};

export const signUp = {
  email: (params: { email: string; password: string; name: string }) =>
    getClientInstance().signUpEmail(params),
};

export const signOut = () => getClientInstance().signOut();
export const getSession = () => getClientInstance().getSession();
export const getBaseClient = () => getClientInstance().getBaseClient();

export const forgotPassword = {
  request: (params: RequestPasswordResetParams) =>
    getClientInstance().requestPasswordReset(params),
  reset: (params: ResetPasswordParams) =>
    getClientInstance().resetPassword(params),
};
