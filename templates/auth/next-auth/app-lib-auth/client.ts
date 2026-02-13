/**
 * App-level client auth exports for NextAuth
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
} from "@repo/auth/client";

export type {
  SignInResult,
  SignUpResult,
  SignOutResult,
  GetSessionResult,
  UseSessionResult,
} from "@repo/auth/types";
