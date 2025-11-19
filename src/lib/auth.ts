import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: "pg",
    schema,
  }),
  secret:
    process.env.BETTER_AUTH_SECRET || "your-secret-key-replace-in-production",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  plugins: [
    nextCookies(),
    organization(),
  ],
});
