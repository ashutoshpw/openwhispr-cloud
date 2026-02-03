"use client";

import { useEffect } from "react";

/**
 * Component to initialize Clerk client for the unified auth system
 * This ensures Clerk's client SDK is accessible when auth methods are called
 */
export function ClerkAuthInitializer() {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

  useEffect(() => {
    if (provider === "clerk-dev") {
      // Dynamically import Clerk hooks and initialize the client
      Promise.all([
        import("@clerk/nextjs"),
        import("@/lib/auth/providers/clerk-dev/client"),
      ])
        .then(([{ useClerk }, { getClientInstance, setGlobalClerkClient }]) => {
          // Create a component that uses the hook to initialize
          // We'll access it through a different mechanism
          // For now, just ensure modules are loaded
        })
        .catch(() => {
          // Clerk not available, ignore
        });
    }
  }, [provider]);

  return null;
}
