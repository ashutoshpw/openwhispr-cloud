/**
 * @repo/auth/clerk/client - Clerk client implementation
 * Import via: import { signIn, signOut, useSession } from "@repo/auth/clerk/client"
 */
"use client";

import { useEffect } from "react";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";

import { getAuthConfig } from "../../config";
import { mapClerkSession } from "../../utils";
import type {
  AuthClientProvider,
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
  RequestPasswordResetParams,
  RequestPasswordResetResult,
  ResetPasswordParams,
  ResetPasswordResult,
} from "../../types";

// Clerk client helpers
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

export async function clerkSignInEmail(
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

      return {
        data: undefined,
      };
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

export async function clerkSignUpEmail(
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
          message:
            "Clerk signUp method is not available. Ensure ClerkProvider is properly configured and client is initialized.",
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

      return {
        data: undefined,
      };
    }

    if (signUpAttempt.status === "missing_requirements") {
      const missingFields = signUpAttempt.missingFields || [];
      const unverifiedFields = signUpAttempt.unverifiedFields || [];

      let errorMessage = "Missing required information for sign-up";
      let isCaptchaIssue = false;

      // Check for CAPTCHA-related issues
      if (
        missingFields.some(
          (field: string) =>
            field.toLowerCase().includes("captcha") ||
            field.toLowerCase().includes("bot") ||
            field === "captcha_token",
        )
      ) {
        errorMessage =
          "Security verification is required. Please wait a moment for verification to complete and try again.";
        isCaptchaIssue = true;
      } else if (unverifiedFields.includes("email_address")) {
        errorMessage =
          "Email verification is required. Please check your email for a verification code.";
      } else if (missingFields.length > 0) {
        const fieldNames = missingFields.map((f: string) => {
          if (f === "email_address") return "email";
          if (f === "phone_number") return "phone number";
          if (f === "first_name") return "first name";
          if (f === "last_name") return "last name";
          return f.replace(/_/g, " ");
        });
        errorMessage = `Missing required fields: ${fieldNames.join(", ")}`;
      } else if (unverifiedFields.length > 0) {
        errorMessage = `Please verify: ${unverifiedFields.join(", ")}`;
      }

      return {
        error: {
          message: errorMessage,
          code: "MISSING_REQUIREMENTS",
          details: {
            missingFields,
            unverifiedFields,
            isCaptchaIssue,
          },
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

export async function clerkSignOut(
  clerkClient: ClerkClientType,
): Promise<SignOutResult> {
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

    if (typeof clerkClient.signOut !== "function") {
      return {
        error: {
          message:
            "Clerk signOut method is not available. Ensure ClerkProvider is properly configured.",
          code: "SIGN_OUT_METHOD_NOT_AVAILABLE",
        },
      };
    }

    await clerkClient.signOut();

    await new Promise((resolve) => setTimeout(resolve, 500));

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

let globalClerkClientRef: ClerkClientType | null = null;

export function setGlobalClerkClient(client: ClerkClientType) {
  globalClerkClientRef = client;
}

export class ClerkClient implements AuthClientProvider {
  private baseURL: string;
  private clerkClientRef: ClerkClientType | null = null;

  constructor() {
    const config = getAuthConfig("clerk");
    this.baseURL = config.baseURL;

    if (typeof window !== "undefined") {
      this.clerkClientRef = globalClerkClientRef;
    }
  }

  setClerkClient(client: ClerkClientType) {
    this.clerkClientRef = client;
    globalClerkClientRef = client;
  }

  async waitForClerkClient(timeoutMs: number = 3000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (
        this.clerkClientRef ||
        globalClerkClientRef ||
        (typeof window !== "undefined" &&
          (window as { __clerk_client__?: ClerkClientType }).__clerk_client__)
      ) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
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
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              email: params.email,
              password: params.password,
            }),
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

            let retries = 3;
            let lastError: { message?: string; code?: string } | null = null;

            while (retries > 0) {
              try {
                const result = await clerkSignInEmail(clerkClient, params);
                if (result.data) {
                  return result;
                }
                if (result.error) {
                  if (result.error.code !== "SIGN_IN_FAILED") {
                    return result;
                  }
                  lastError = result.error;
                }
              } catch (error: unknown) {
                lastError = error as { message?: string; code?: string };
              }

              if (retries > 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
              retries--;
            }

            if (lastError) {
              return {
                error: {
                  message:
                    lastError.message ||
                    "Failed to authenticate with Clerk after migration",
                  code: lastError.code || "AUTHENTICATION_FAILED",
                },
              };
            }
          } else {
            return {
              data: serverResult.data,
            };
          }
        }

        if (
          serverResult.error?.code === "CLIENT_SIDE_REQUIRED" ||
          serverResult.error?.code === "INVALID_CREDENTIALS"
        ) {
          // Fall through to client-side
        } else if (serverResult.error) {
          return {
            error: {
              message: serverResult.error.message || "Failed to sign in",
              code: serverResult.error.code || "SIGN_IN_ERROR",
            },
          };
        }
      } catch (serverError) {
        // Server-side failed, fall through to client-side
      }

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
          message:
            "Clerk sign-in requires client context. Ensure ClerkProvider is configured and use the hook-based helpers.",
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
      let clerkClient = this.clerkClientRef;
      if (!clerkClient) {
        clerkClient = globalClerkClientRef;
      }
      if (!clerkClient && typeof window !== "undefined") {
        clerkClient =
          (window as { __clerk_client__?: ClerkClientType }).__clerk_client__ ||
          null;
      }
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
          message:
            "Clerk sign-up requires ClerkProvider context. Make sure ClerkProvider wraps your app and use signUp.email() from a client component within that context.",
          code: "CLERK_PROVIDER_REQUIRED",
        },
      };
    } catch (error: unknown) {
      console.error("[ClerkClient] Exception in signUpEmail:", error);
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
          error: {
            message: result.error.message || "Failed to get session",
          },
        };
      }

      return {
        data: result.data || undefined,
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
    throw new Error(
      "useSession must be called via the exported useSession hook, not directly on the class",
    );
  }

  async requestPasswordReset(
    _params: RequestPasswordResetParams,
  ): Promise<RequestPasswordResetResult> {
    // Clerk handles password reset through their hosted UI
    // Redirect to Clerk's forgot password flow
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in#/forgot-password";
    }
    return { success: true };
  }

  async resetPassword(
    _params: ResetPasswordParams,
  ): Promise<ResetPasswordResult> {
    // Clerk handles password reset through their hosted UI
    return {
      error: {
        message:
          "Password reset is handled by Clerk. Please use the forgot password flow.",
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

export const getClientInstance = () => {
  if (!clientInstance) {
    clientInstance = new ClerkClient();
  }
  return clientInstance;
};

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
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

  const { isLoaded: authLoaded, userId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  if (provider !== "clerk") {
    return {
      data: null,
      isLoading: false,
    };
  }

  const isLoading = !authLoaded || !userLoaded;

  if (isLoading) {
    return {
      data: null,
      isLoading: true,
    };
  }

  if (!user || !userId) {
    return {
      data: null,
      isLoading: false,
    };
  }

  const session = mapClerkSession(user);
  return {
    data: session,
    isLoading: false,
  };
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
