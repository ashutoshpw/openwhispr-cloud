/**
 * App-level client auth exports for Clerk
 */
"use client";

export {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
  forgotPassword,
  getBaseClient,
  useClerkClient,
  useInitializeClerkClient,
  setGlobalClerkClient,
} from "@repo/auth/client";

export type {
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
} from "@repo/auth/types";
