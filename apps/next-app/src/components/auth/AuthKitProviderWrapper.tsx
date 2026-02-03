"use client";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { ReactNode } from "react";

/**
 * Wrapper component that provides AuthKit context for unified auth system
 * Only wraps children when AuthKit is the active provider
 *
 * Note: If @workos-inc/authkit-nextjs is removed from package.json, this file will cause
 * a build error when AuthKit is the active provider (expected). When using other providers,
 * Next.js will tree-shake this component, so removal won't affect other providers.
 */
export function AuthKitProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthKitProvider>{children}</AuthKitProvider>;
}
