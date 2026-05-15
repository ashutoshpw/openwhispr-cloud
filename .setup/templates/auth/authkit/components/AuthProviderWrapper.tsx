"use client";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { ReactNode } from "react";

/**
 * AuthProviderWrapper for WorkOS AuthKit
 *
 * AuthKit requires AuthKitProvider wrapper for authentication to work.
 */
export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthKitProvider>{children}</AuthKitProvider>;
}
