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

function authHost(request: NextRequest, path: string): string {
  const base =
    process.env.NEXT_PUBLIC_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    new URL("/auth/sign-in", request.url).origin;
  return `${base.replace(/\/$/, "")}${path}`;
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
    // No configured auth host means this deployment IS isolated — send the
    // browser to this origin's own sign-in route (preview-friendly).
    return NextResponse.redirect(authHost(request, "/auth/sign-in"));
  }

  const isAdmin = await getSiteAdminStatus(session.user.id);
  if (!isAdmin) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  // handoff page + handoff API are the token entry points and validate their
  // own one-time token without a session (api/auth stays excluded for the
  // Better Auth callback surface).
  matcher: ["/((?!.*\\..*|_next|api/auth|api/admin/handoff|handoff).*)", "/"],
};
