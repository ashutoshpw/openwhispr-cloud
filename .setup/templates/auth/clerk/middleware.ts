/**
 * Middleware for Clerk
 *
 * Uses Clerk's clerkMiddleware for session management.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/adminx(.*)",
  "/user-profile(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
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

  // Protect routes using Clerk's built-in protection
  if (isProtectedRoute(request)) {
    await auth.protect();

    // For admin routes, check admin status
    if (pathname.startsWith("/adminx")) {
      const authResult = await auth();
      const userId = authResult.userId;

      if (userId) {
        try {
          const { clerkClient } = await import("@clerk/nextjs/server");
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);

          if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
            const email = clerkUser.emailAddresses[0].emailAddress;

            // Check admin status by email in database
            const { db } = await import("@repo/database");
            const { user } = await import("@repo/database/schema");
            const { eq } = await import("@repo/database");

            const userRecord = await db()
              .select({ role: user.role })
              .from(user)
              .where(eq(user.email, email))
              .limit(1);

            if (
              userRecord.length === 0 ||
              userRecord[0].role !== "site-admin"
            ) {
              return new NextResponse(null, { status: 404 });
            }
          } else {
            return new NextResponse(null, { status: 404 });
          }
        } catch (error) {
          console.error("[Middleware] Error checking admin status:", error);
          return new NextResponse(null, { status: 404 });
        }
      } else {
        return new NextResponse(null, { status: 404 });
      }
    }
  }

  // Add CORS headers to all responses
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS",
  );
  response.headers.set("Access-Control-Allow-Headers", "*");

  return response;
});

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
