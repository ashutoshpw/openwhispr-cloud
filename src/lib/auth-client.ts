import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

const baseClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const authClient = baseClient.$use(organizationClient());

export const { useSession, signIn, signUp, signOut } = baseClient;

export type AuthClient = typeof authClient;
