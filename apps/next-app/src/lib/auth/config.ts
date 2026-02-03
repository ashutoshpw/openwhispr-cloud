export type AuthProvider =
  | "better-auth"
  | "next-auth"
  | "authkit"
  | "clerk-dev";

export function getProviderName(): AuthProvider {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

  const validProviders: AuthProvider[] = [
    "better-auth",
    "next-auth",
    "authkit",
    "clerk-dev",
  ];
  if (!validProviders.includes(provider as AuthProvider)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_AUTH_PROVIDER: "${provider}". Must be one of: ${validProviders.join(
        ", ",
      )}`,
    );
  }

  return provider as AuthProvider;
}

export function validateConfig(provider: AuthProvider): void {
  const isServer = typeof window === "undefined";

  if (!isServer) {
    return;
  }

  if (provider === "better-auth") {
    if (!process.env.BETTER_AUTH_SECRET) {
      throw new Error(
        "BETTER_AUTH_SECRET environment variable is required for better-auth provider",
      );
    }
  } else if (provider === "next-auth") {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error(
        "NEXTAUTH_SECRET environment variable is required for next-auth provider",
      );
    }
    if (!process.env.NEXTAUTH_URL) {
      throw new Error(
        "NEXTAUTH_URL environment variable is required for next-auth provider",
      );
    }
  } else if (provider === "authkit") {
    if (!process.env.WORKOS_API_KEY) {
      throw new Error(
        "WORKOS_API_KEY environment variable is required for authkit provider",
      );
    }
    if (!process.env.WORKOS_CLIENT_ID) {
      throw new Error(
        "WORKOS_CLIENT_ID environment variable is required for authkit provider",
      );
    }
    if (!process.env.WORKOS_COOKIE_PASSWORD) {
      throw new Error(
        "WORKOS_COOKIE_PASSWORD environment variable is required for authkit provider (must be at least 32 characters)",
      );
    }
    if (!process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI) {
      throw new Error(
        "NEXT_PUBLIC_WORKOS_REDIRECT_URI environment variable is required for authkit provider",
      );
    }
  } else if (provider === "clerk-dev") {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      throw new Error(
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable is required for clerk-dev provider",
      );
    }
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error(
        "CLERK_SECRET_KEY environment variable is required for clerk-dev provider",
      );
    }
  }
}

export function getAuthConfig(provider: AuthProvider) {
  const isServer = typeof window === "undefined";

  if (isServer) {
    validateConfig(provider);
  }

  const baseURL =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  if (provider === "better-auth") {
    return {
      secret: process.env.BETTER_AUTH_SECRET || "",
      baseURL: process.env.BETTER_AUTH_URL || baseURL,
    };
  } else if (provider === "next-auth") {
    return {
      secret: process.env.NEXTAUTH_SECRET || "",
      url: process.env.NEXTAUTH_URL || "",
      baseURL,
    };
  } else if (provider === "authkit") {
    const redirectURI =
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ||
      `${baseURL}/api/auth/callback`;

    return {
      apiKey: process.env.WORKOS_API_KEY || "",
      clientId: process.env.WORKOS_CLIENT_ID || "",
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD || "",
      redirectURI,
      baseURL,
    };
  } else if (provider === "clerk-dev") {
    return {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
      secretKey: process.env.CLERK_SECRET_KEY || "",
      baseURL,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}
