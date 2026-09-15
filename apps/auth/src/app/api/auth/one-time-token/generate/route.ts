import { createHash } from "node:crypto";
import { randomBytes } from "node:crypto";
import { getBetterAuthServer } from "@repo/auth/server";
import { db } from "@repo/database";
import { oneTimeToken } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/one-time-token/generate (bearer-authenticated)
 *
 * Desktop contract: returns { token } — a single-use secret the desktop opens
 * as https://admin.openwhispr.com/handoff#token=<token>. The admin console
 * validates it against this server's one_time_token table (shared DB).
 */
export async function POST() {
  const server = getBetterAuthServer();
  const session = await server.getSession(await headers());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60s single-use window

  await db().insert(oneTimeToken).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    tokenHash,
    purpose: "admin_handoff",
    expiresAt,
  });

  return NextResponse.json({ token: raw });
}
