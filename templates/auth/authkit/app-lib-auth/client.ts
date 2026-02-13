/**
 * Client-side auth utilities for AuthKit
 *
 * Re-exports client functions from @repo/auth/client for use in the app.
 */
"use client";

export {
  useSession,
  signIn,
  signUp,
  signOut,
  getSession,
  forgotPassword,
  getClientInstance,
} from "@repo/auth/client";

export type {
  UnifiedSession,
  UnifiedUser,
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
} from "@repo/auth/client";
