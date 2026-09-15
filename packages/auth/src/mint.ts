/**
 * Server-side bearer-token minting for browser handoff flows.
 *
 * The desktop app receives `bearer_token` on its deep link after a hosted
 * (browser) OAuth/SSO sign-in. This helper creates a fresh Better Auth
 * session for the user and returns the signed token value the desktop can
 * send as `Authorization: Bearer <token>` — identical to what the bearer()
 * plugin issues in the `set-auth-token` response header.
 */
import "server-only";

import { db } from "@repo/database";
import { session } from "@repo/database/schema";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { getBetterAuthServer } from "./server";

export async function mintBearerToken(userId: string): Promise<string | null> {
  const server = getBetterAuthServer();
  const authInstance = server.getAuthInstance();

  // $context is the documented escape hatch for internal adapters
  // (sessionTokens.create signs the cookie value for us).
  const ctx = await (
    authInstance as unknown as {
      $context: Promise<{
        internalAdapter: {
          createSession: (
            userId: string,
            remember?: boolean,
          ) => Promise<{ token: string; expiresAt: Date }>;
        };
        signCookie: (token: string) => Promise<string>;
        context: { cookieOptions?: { attributes?: Record<string, unknown> } };
      }>;
    }
  ).$context;

  const created = await ctx.internalAdapter.createSession(userId, true);
  const signed = await ctx.signCookie(created.token);
  return signed;
}

/**
 * Read the raw session token for a user directly from the session table —
 * fallback used by hosted continuation pages that already hold a valid
 * cookie session.
 */
export async function latestSessionToken(
  userId: string,
): Promise<string | null> {
  const [row] = await db()
    .select({ token: session.token })
    .from(session)
    .where(and(eq(session.userId, userId), isNull(session.ipAddress)))
    .orderBy(desc(session.createdAt))
    .limit(1);
  if (row) return row.token;

  const [anyRow] = await db()
    .select({ token: session.token })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.createdAt))
    .limit(1);
  return anyRow?.token ?? null;
}
