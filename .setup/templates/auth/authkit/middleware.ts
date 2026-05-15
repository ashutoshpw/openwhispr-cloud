/**
 * Middleware for WorkOS AuthKit
 *
 * Uses AuthKit's authkit() function for session management.
 */
import { authkit } from "@workos-inc/authkit-nextjs";
import { type NextRequest, NextResponse } from "next/server";

// Define protected routes
const protectedPaths = [
  "/dashboard",
  "/adminx",
  "/user-profile",
  "/onboarding",
];

function isProtectedRoute(pathname: string): boolean {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle OPTIONS requests for CORS
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

  // Get session from AuthKit
  const { session, headers: authHeaders } = await authkit(request);

  // Protect routes
  if (isProtectedRoute(pathname)) {
    if (!session || !session.user) {
      // Redirect to sign-in
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // For admin routes, check admin status
    if (pathname.startsWith("/adminx")) {
      try {
        const { db } = await import("@repo/database");
        const { user } = await import("@repo/database/schema");
        const { eq } = await import("@repo/database");

        const userRecord = await db()
          .select({ role: user.role })
          .from(user)
          .where(eq(user.email, session.user.email))
          .limit(1);

        if (userRecord.length === 0 || userRecord[0].role !== "site-admin") {
          return new NextResponse(null, { status: 404 });
        }
      } catch (error) {
        console.error("[Middleware] Error checking admin status:", error);
        return new NextResponse(null, { status: 404 });
      }
    }
  }

  // Create response with CORS headers
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Copy auth headers from AuthKit
  authHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  // Add CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS",
  );
  response.headers.set("Access-Control-Allow-Headers", "*");

  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
