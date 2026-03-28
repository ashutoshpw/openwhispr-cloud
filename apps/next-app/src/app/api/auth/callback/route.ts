import { getBetterAuthServer } from "@repo/auth/server";
import { NextResponse } from "next/server";

/**
 * AuthKit callback route - only used when AuthKit provider is active.
 * Since this project uses Better Auth, this route returns 404.
 * Better Auth handles its own callbacks via the [...all] catch-all route.
 */
export async function GET() {
  return NextResponse.json(
    { error: "This callback route is not used with Better Auth" },
    { status: 404 },
  );
}
