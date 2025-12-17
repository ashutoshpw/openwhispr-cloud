"use client";

import { useEffect } from "react";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";
import { getAuthConfig } from "../../config";
import { mapClerkSession } from "../../utils/schema-mapper";
import type {
  AuthClientProvider,
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
} from "../../types";

export async function clerkSignInEmail(
  clerkClient: any,
  params: { email: string; password: string }
): Promise<SignInResult> {
  try {
    if (!clerkClient) {
      return {
        error: {
          message: "Clerk client is not available. Make sure ClerkProvider is configured.",
          code: "CLERK_NOT_AVAILABLE",
        },
      };
    }

    const client = clerkClient.client || clerkClient;
    const signInAttempt = await client.signIn.create({
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
  } catch (error: any) {
    return {
      error: {
        message: error?.message || "Failed to sign in",
        code: error?.code || "SIGN_IN_ERROR",
      },
    };
  }
}

export async function clerkSignUpEmail(
  clerkClient: any,
  params: { email: string; password: string; name: string }
): Promise<SignUpResult> {
  try {
    if (!clerkClient) {
      return {
        error: {
          message: "Clerk client is not available. Make sure ClerkProvider is configured.",
          code: "CLERK_NOT_AVAILABLE",
        },
      };
    }

    const nameParts = params.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const client = clerkClient.client || clerkClient;
    
    if (!client || !client.signUp) {
      return {
        error: {
          message: "Clerk signUp method is not available. Ensure ClerkProvider is properly configured and client is initialized.",
          code: "SIGNUP_NOT_AVAILABLE",
        },
      };
    }
    
    const signUpAttempt = await client.signUp.create({
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
      const verifications = (signUpAttempt as any).verifications || {};
      
      let errorMessage = "Missing required information for sign-up";
      let isCaptchaIssue = false;
      
      // Check for CAPTCHA-related issues
      if (missingFields.some((field: string) => 
        field.toLowerCase().includes('captcha') || 
        field.toLowerCase().includes('bot') ||
        field === 'captcha_token'
      )) {
        errorMessage = "Security verification is required. Please wait a moment for verification to complete and try again.";
        isCaptchaIssue = true;
      }
      else if (unverifiedFields.includes('email_address') || 
               verifications?.email_address?.next_action === 'needs_prepare') {
        errorMessage = "Email verification is required. Please check your email for a verification code.";
      }
      else if (missingFields.length > 0) {
        const fieldNames = missingFields.map((f: string) => {
          if (f === 'email_address') return 'email';
          if (f === 'phone_number') return 'phone number';
          if (f === 'first_name') return 'first name';
          if (f === 'last_name') return 'last name';
          return f.replace(/_/g, ' ');
        });
        errorMessage = `Missing required fields: ${fieldNames.join(', ')}`;
      }
      else if (unverifiedFields.length > 0) {
        errorMessage = `Please verify: ${unverifiedFields.join(', ')}`;
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
  } catch (error: any) {
    if (error?.errors) {
      const clerkError = error.errors[0];
      return {
        error: {
          message: clerkError?.message || "Failed to sign up",
          code: clerkError?.code || "SIGN_UP_ERROR",
        },
      };
    }

    return {
      error: {
        message: error?.message || "Failed to sign up",
        code: error?.code || "SIGN_UP_ERROR",
      },
    };
  }
}

export async function clerkSignOut(
  clerkClient: any
): Promise<SignOutResult> {
  try {
    if (!clerkClient) {
      return {
        error: {
          message: "Clerk client is not available. Make sure ClerkProvider is configured.",
          code: "CLERK_NOT_AVAILABLE",
        },
      };
    }

    if (typeof clerkClient.signOut !== "function") {
      return {
        error: {
          message: "Clerk signOut method is not available. Ensure ClerkProvider is properly configured.",
          code: "SIGN_OUT_METHOD_NOT_AVAILABLE",
        },
      };
    }

    await clerkClient.signOut();

    await new Promise((resolve) => setTimeout(resolve, 500));

    return {};
  } catch (error: any) {
    return {
      error: {
        message: error?.message || "Failed to sign out",
        code: error?.code || "SIGN_OUT_ERROR",
      },
    };
  }
}

let globalClerkClientRef: any = null;

export function setGlobalClerkClient(client: any) {
  globalClerkClientRef = client;
}

export class ClerkClient implements AuthClientProvider {
  private baseURL: string;
  private clerkClientRef: any = null;

  constructor() {
    const config = getAuthConfig("clerk-dev");
    this.baseURL = config.baseURL;
    
    if (typeof window !== "undefined") {
      this.clerkClientRef = globalClerkClientRef;
    }
  }

  setClerkClient(client: any) {
    this.clerkClientRef = client;
    globalClerkClientRef = client;
  }

  async waitForClerkClient(timeoutMs: number = 3000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (
        this.clerkClientRef ||
        globalClerkClientRef ||
        (typeof window !== "undefined" && (window as any).__clerk_client__)
      ) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    return false;
  }

  async signInEmail(params: { email: string; password: string }): Promise<SignInResult> {
    try {
      try {
        const serverResponse = await fetch(`${this.baseURL}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: params.email,
            password: params.password,
          }),
        });

        const serverResult = await serverResponse.json();

        if (serverResult.data && !serverResult.error) {
          const clerkClient = this.clerkClientRef || 
                            (typeof window !== "undefined" ? (window as any).__clerk_client__ : null);

          if (clerkClient) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            
            let retries = 3;
            let lastError: any = null;
            
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
              } catch (error: any) {
                lastError = error;
              }
              
              if (retries > 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
              retries--;
            }
            
            if (lastError) {
              return {
                error: {
                  message: lastError.message || "Failed to authenticate with Clerk after migration",
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

        if (serverResult.error?.code === "CLIENT_SIDE_REQUIRED" || 
            serverResult.error?.code === "INVALID_CREDENTIALS") {
        } else if (serverResult.error) {
          return {
            error: {
              message: serverResult.error.message || "Failed to sign in",
              code: serverResult.error.code || "SIGN_IN_ERROR",
            },
          };
        }
      } catch (serverError: any) {
        // Server-side failed, fall through to client-side
      }

      const clerkClient = this.clerkClientRef || 
                        (typeof window !== "undefined" ? (window as any).__clerk_client__ : null);

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
    } catch (error: any) {
      return {
        error: {
          message: error?.message || "Failed to sign in",
          code: error?.code || "SIGN_IN_ERROR",
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
        clerkClient = (window as any).__clerk_client__;
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

      if (typeof window !== "undefined") {
        try {
          await import("@clerk/nextjs");
        } catch (importError) {
          console.error('[ClerkClient] Failed to import @clerk/nextjs:', importError);
        }
      }

      return {
        error: {
          message:
            "Clerk sign-up requires ClerkProvider context. Make sure ClerkProvider wraps your app and use signUp.email() from a client component within that context.",
          code: "CLERK_PROVIDER_REQUIRED",
        },
      };
    } catch (error: any) {
      console.error('[ClerkClient] Exception in signUpEmail:', error);
      return {
        error: {
          message: error?.message || "Failed to sign up",
          code: error?.code || "SIGN_UP_ERROR",
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
          message:
              errorData.error?.message || "Failed to sign out",
            code: errorData.error?.code || "SIGN_OUT_ERROR",
        },
      };
      }

      return {};
    } catch (error: any) {
      return {
        error: {
          message: error?.message || "Failed to sign out",
          code: error?.code || "SIGN_OUT_ERROR",
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
          message: error instanceof Error ? error.message : "Failed to get session",
        },
      };
    }
  }

  useSession(): UseSessionResult {
    throw new Error(
      "useSession must be called via the exported useSession hook, not directly on the class"
    );
  }

  getBaseClient() {
    return null;
  }
}

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
    client.setClerkClient(clerk);
    setGlobalClerkClient(clerk);
  }

  return client;
}

export function useInitializeClerkClient() {
  const clerk = useClerk();
  
  useEffect(() => {
    if (clerk) {
      setGlobalClerkClient(clerk);
      const client = getClientInstance();
      client.setClerkClient(clerk);
    }
  }, [clerk]);
  
  return clerk;
}

export const useSession = (): UseSessionResult => {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
  
  if (provider !== "clerk-dev") {
    return {
      data: null,
      isLoading: false,
    };
  }

  const { isLoaded: authLoaded, userId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

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
