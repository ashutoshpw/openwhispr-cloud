/**
 * Proxy for OpenWhispr www
 *
 * Gates the dashboard/account areas on a Better Auth session. Sign-in lives on
 * the auth host, so unauthenticated hits are redirected there.
 */
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Cookie constants for workspace caching
const HAS_WORKSPACE_COOKIE = "has_workspace";
const WORKSPACE_COOKIE_TTL = 5 * 60; // 5 minutes

function authHost(request: NextRequest, path: string): string {
  // Preview/staging deployments set NEXT_PUBLIC_AUTH_URL to their own auth
  // host; production falls back to the canonical domain.
  const base =
    process.env.NEXT_PUBLIC_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    new URL("/auth/sign-in", request.url).origin;
  return `${base.replace(/\/$/, "")}${path}`;
}

/**
 * Check if user has workspaces, using cookie cache when available.
 */
async function checkUserWorkspaces(
  request: NextRequest,
  userId: string,
): Promise<{ hasWorkspace: boolean; shouldSetCookie: boolean }> {
  // Check cookie cache first
  const cachedValue = request.cookies.get(HAS_WORKSPACE_COOKIE)?.value;
  if (cachedValue === "1") {
    return { hasWorkspace: true, shouldSetCookie: false };
  }
  if (cachedValue === "0") {
    return { hasWorkspace: false, shouldSetCookie: false };
  }

  // No cache, query database
  try {
    const { db } = await import("@repo/database");
    const { member } = await import("@repo/database/schema");
    const { and, eq } = await import("@repo/database");

    const userMembers = await db()
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1);

    const hasWorkspace = userMembers.length > 0;
    return { hasWorkspace, shouldSetCookie: true };
  } catch (error) {
    console.error("[Proxy] Error checking workspaces:", error);
    return { hasWorkspace: true, shouldSetCookie: false };
  }
}

/**
 * Add workspace cookie to response headers.
 */
function setWorkspaceCookie(
  response: NextResponse,
  hasWorkspace: boolean,
): void {
  const value = hasWorkspace ? "1" : "0";
  response.cookies.set(HAS_WORKSPACE_COOKIE, value, {
    path: "/",
    maxAge: WORKSPACE_COOKIE_TTL,
    sameSite: "lax",
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protected routes: dashboard, account
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/account")) {
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
      const response = NextResponse.redirect(
        authHost(request, "/auth/sign-in"),
      );
      response.cookies.delete(HAS_WORKSPACE_COOKIE);
      return response;
    }

    // Check workspaces for dashboard routes
    if (pathname.startsWith("/dashboard")) {
      const { hasWorkspace, shouldSetCookie } = await checkUserWorkspaces(
        request,
        session.user.id,
      );

      if (!hasWorkspace) {
        const response = NextResponse.redirect(
          authHost(request, "/auth/onboarding"),
        );
        if (shouldSetCookie) {
          setWorkspaceCookie(response, false);
        }
        return response;
      }

      if (shouldSetCookie) {
        const response = NextResponse.next();
        setWorkspaceCookie(response, true);
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
};
