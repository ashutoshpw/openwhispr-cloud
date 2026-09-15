/**
 * Resolve the auth host for links and redirects.
 *
 * The auth app (sign-in/up/onboarding) deploys separately from www, so all
 * auth links must be absolute. NEXT_PUBLIC_AUTH_URL is set per Vercel
 * project; production falls back to the canonical domain.
 */
export function authUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.openwhispr.com";
  return `${base.replace(/\/$/, "")}${path}`;
}

export const AUTH_SIGN_IN = authUrl("/auth/sign-in");
export const AUTH_SIGN_UP = authUrl("/auth/sign-up");
