"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Clerk client initializer component
 * Ensures Clerk client is available for unified auth system
 */
function ClerkInitializer() {
  // Dynamic imports to avoid SSR issues
  const { useClerk } = require("@clerk/nextjs");
  const {
    getClientInstance,
    setGlobalClerkClient,
  } = require("@repo/auth/client");

  const clerk = useClerk();
  const client = getClientInstance();

  useEffect(() => {
    if (clerk && client) {
      client.setClerkClient(clerk);
      setGlobalClerkClient(clerk);
    }
  }, [clerk, client]);

  return null;
}

/**
 * AuthProviderWrapper for Clerk
 *
 * Clerk requires ClerkProvider wrapper for authentication to work.
 * This also initializes the Clerk client for the unified auth system.
 */
export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ClerkInitializer />
      {children}
    </ClerkProvider>
  );
}
