"use client";

import { useEffect } from "react";

/**
 * Wrapper component that initializes Clerk client for unified auth system
 * Only initializes when Clerk is the active provider
 */
export function ClerkInitializerWrapper({ children }: { children: React.ReactNode }) {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

  // Only initialize Clerk if it's the active provider
  if (provider !== "clerk-dev") {
    return <>{children}</>;
  }

  // Dynamically import and use Clerk initialization hook
  // This ensures Clerk client is available when auth methods are called
  const ClerkInit = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useClerk } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getClientInstance, setGlobalClerkClient } = require("@/lib/auth/providers/clerk-dev/client") as typeof import("@/lib/auth/providers/clerk-dev/client");
    
    const clerk = useClerk();
    const client = getClientInstance();
    
    useEffect(() => {
      if (clerk && client) {
        client.setClerkClient(clerk);
        setGlobalClerkClient(clerk);
      }
    }, [clerk, client]);
    
    return null;
  };

  return (
    <>
      <ClerkInit />
      {children}
    </>
  );
}

