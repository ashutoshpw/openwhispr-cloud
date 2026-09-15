import { db } from "@repo/database";
import { eq } from "@repo/database";
import { user } from "@repo/database/schema";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/verification-status?email= → { verified }
 * Called by the desktop renderer directly with credentials: "include" —
 * CORS origin echo + credentials required.
 */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: { message: "email is required" } },
      { status: 400 },
    );
  }

  const [row] = await db()
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  return NextResponse.json(
    { verified: row?.emailVerified ?? false },
    {
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("origin") ?? "*",
        "Access-Control-Allow-Credentials": "true",
      },
    },
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("origin") ?? "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
