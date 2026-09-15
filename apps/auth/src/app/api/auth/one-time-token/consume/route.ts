import { createHash } from "node:crypto";
import { db } from "@repo/database";
import { and, eq, isNull, sql } from "@repo/database";
import { oneTimeToken } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/one-time-token/consume
 *
 * Exchange a one-time token for the owning user's session context. Consumed
 * exactly once: the row is stamped `used_at` atomically, so a replayed token
 * (or a token guessed from the fragment) is rejected.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
  } | null;
  const raw = body?.token;
  if (!raw) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(raw).digest("hex");

  const [row] = await db()
    .update(oneTimeToken)
    .set({ usedAt: sql`now()` })
    .where(
      and(
        eq(oneTimeToken.tokenHash, tokenHash),
        isNull(oneTimeToken.usedAt),
        sql`${oneTimeToken.expiresAt} > now()`,
      ),
    )
    .returning();

  if (!row) {
    return NextResponse.json(
      { error: { message: "Invalid or expired token", code: "invalid_token" } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    userId: row.userId,
    purpose: row.purpose,
    payload: row.payload ?? null,
  });
}
