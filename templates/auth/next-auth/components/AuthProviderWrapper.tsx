"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * AuthProviderWrapper for NextAuth
 *
 * NextAuth requires a SessionProvider wrapper for client-side session access.
 * This enables the useSession hook to work properly.
 */
export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
