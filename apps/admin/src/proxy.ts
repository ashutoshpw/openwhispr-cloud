/**
 * Proxy for OpenWhispr admin
 *
 * Gates the whole console on a Better Auth session + site-admin role.
 * Sign-in lives on the auth host.
 */
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

function authHost(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.openwhispr.com";
  return `${base}${path}`;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Gate everything except Next internals; handoff is the token entry point
  // and validates its own one-time token without a session.
  if (pathname.startsWith("/handoff")) {
    return NextResponse.next();
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    console.error("[Proxy] Error getting session:", error);
    session = null;
  }

  if (!session) {
    return NextResponse.redirect(authHost("/auth/sign-in"));
  }

  const isAdmin = await getSiteAdminStatus(session.user.id);
  if (!isAdmin) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next|api/auth).*)", "/"],
};
