/**
 * Proxy for Better Auth
 *
 * Simplified proxy with no provider switching.
 * ~120 lines vs 471 lines in the multi-provider version.
 */
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Cookie constants for workspace caching
const HAS_WORKSPACE_COOKIE = "has_workspace";
const WORKSPACE_COOKIE_TTL = 5 * 60; // 5 minutes

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
    const { eq } = await import("@repo/database");

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

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse): void {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS",
  );
  response.headers.set("Access-Control-Allow-Headers", "*");
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // Protected routes: dashboard, user-profile, onboarding
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth/user-profile") ||
    pathname.startsWith("/auth/onboarding")
  ) {
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
        new URL("/auth/sign-in", request.url),
      );
      response.cookies.delete(HAS_WORKSPACE_COOKIE);
      addCorsHeaders(response);
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
          new URL("/auth/onboarding", request.url),
        );
        if (shouldSetCookie) {
          setWorkspaceCookie(response, false);
        }
        addCorsHeaders(response);
        return response;
      }

      if (shouldSetCookie) {
        const response = NextResponse.next();
        setWorkspaceCookie(response, true);
        addCorsHeaders(response);
        return response;
      }
    }
  }

  // Admin portal protection
  if (pathname.startsWith("/adminx")) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }

    const isAdmin = await getSiteAdminStatus(session.user.id);
    if (!isAdmin) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // Default response with CORS headers
  const response = NextResponse.next();
  addCorsHeaders(response);
  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
