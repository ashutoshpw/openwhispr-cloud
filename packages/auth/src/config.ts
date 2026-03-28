/**
 * @repo/auth/config - Auth configuration
 *
 * Since this project uses Better Auth exclusively,
 * provider name always returns "better-auth".
 */

export function getProviderName(): string {
  return "better-auth";
}

export function getAuthConfig(provider?: string) {
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:8801");
  const secret =
    process.env.BETTER_AUTH_SECRET || "development-secret-change-me";

  return { baseURL, secret };
}
