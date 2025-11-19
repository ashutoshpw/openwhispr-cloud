import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const baseClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000",
  plugins: [organizationClient()],
});

export const authClient = baseClient;

export const useSession = baseClient.useSession;
export const signIn = baseClient.signIn;
export const signUp = baseClient.signUp;
export const signOut = baseClient.signOut;

export type AuthClient = typeof authClient;
