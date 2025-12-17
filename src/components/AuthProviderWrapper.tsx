"use client";
import { type ReactNode } from "react";

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

  if (authProvider === "next-auth") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SessionProvider } = require("next-auth/react") as typeof import("next-auth/react");
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.NEXT_PUBLIC_VERCEL_URL || 
                    "http://localhost:3000";
    return (
      <SessionProvider baseUrl={baseURL}>
        {children}
      </SessionProvider>
    );
  }

  if (authProvider === "clerk-dev") {
    // Dynamic require to avoid bundling Clerk for other providers
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ClerkProvider } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ClerkInitializerWrapper } = require("@/components/auth/ClerkInitializerWrapper") as typeof import("@/components/auth/ClerkInitializerWrapper");
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error("[AuthProviderWrapper] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required for Clerk provider");
      return <>{children}</>;
    }
    
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        appearance={{
          cssLayerName: "clerk",
        }}
      >
        <ClerkInitializerWrapper>
        {children}
        </ClerkInitializerWrapper>
      </ClerkProvider>
    );
  }

  if (authProvider === "authkit") {
    // Use wrapper component to handle AuthKit provider import
    // This isolates the ESM module import and allows Next.js to properly tree-shake
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AuthKitProviderWrapper } = require("@/components/auth/AuthKitProviderWrapper") as typeof import("@/components/auth/AuthKitProviderWrapper");
    
    return (
      <AuthKitProviderWrapper>
        {children}
      </AuthKitProviderWrapper>
    );
  }

  return <>{children}</>;
}

