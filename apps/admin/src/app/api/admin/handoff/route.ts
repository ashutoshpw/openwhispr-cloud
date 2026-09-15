import { createHash } from "node:crypto";
import { mintBearerToken } from "@repo/auth";
import { and, eq, isNull, sql } from "@repo/database";
import { db } from "@repo/database";
import { oneTimeToken, user } from "@repo/database/schema";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/handoff
 *
 * Exchanges a single-use admin handoff token (delivered via the URL fragment,
 * which never reaches the server) for a Better Auth session cookie.
 *
 * Public by design: the token IS the auth. The proxy matcher excludes this
 * path, and the token is consumed atomically before any session is minted.
 */

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sessionCookieName(): string {
  // Better Auth's configured prefix is "openwhispr"; __Secure- in production.
  return process.env.NODE_ENV === "production"
    ? "__Secure-openwhispr.session_token"
    : "openwhispr.session_token";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
  } | null;
  const raw = body?.token;
  if (!raw || typeof raw !== "string") {
    return NextResponse.json(
      { error: { message: "token is required", code: "invalid_request" } },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(raw).digest("hex");

  // Atomic single-use consume: the update only lands while usedAt is still
  // NULL and the token hasn't expired, so a replayed token finds no row.
  const [tokenRow] = await db()
    .update(oneTimeToken)
    .set({ usedAt: sql`now()` })
    .where(
      and(
        eq(oneTimeToken.tokenHash, tokenHash),
        eq(oneTimeToken.purpose, "admin_handoff"),
        isNull(oneTimeToken.usedAt),
        sql`${oneTimeToken.expiresAt} > now()`,
      ),
    )
    .returning();

  if (!tokenRow) {
    return NextResponse.json(
      {
        error: {
          message: "Invalid or expired token",
          code: "invalid_token",
        },
      },
      { status: 401 },
    );
  }

  const [userRow] = await db()
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, tokenRow.userId))
    .limit(1);

  if (!userRow) {
    return NextResponse.json(
      { error: { message: "User not found", code: "invalid_token" } },
      { status: 401 },
    );
  }

  if (userRow.role !== "site-admin") {
    return NextResponse.json(
      { error: { message: "Forbidden", code: "not_site_admin" } },
      { status: 403 },
    );
  }

  const signedToken = await mintBearerToken(userRow.id);
  if (!signedToken) {
    return NextResponse.json(
      { error: { message: "Failed to create session", code: "server_error" } },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: sessionCookieName(),
    value: signedToken,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return response;
}
