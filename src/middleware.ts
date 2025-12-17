import { auth } from "@/lib/auth";
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { headers } from "next/headers";
import { type NextRequest, type NextFetchEvent, NextResponse } from "next/server";

async function unifiedAuthMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  // Check if the route is protected (dashboard and user-profile)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/user-profile")) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  // Check if the route is admin portal
  if (pathname.startsWith("/adminx")) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const isAdmin = await getSiteAdminStatus(session.user.id);
    if (!isAdmin) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // Add CORS headers to all responses for ChatGPT Apps SDK
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "*");

  return response;
}

async function clerkWrappedMiddleware(request: NextRequest, event?: NextFetchEvent) {
  // Dynamic import - only loads when Clerk is active
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  
  // Define protected routes
  const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/adminx(.*)', '/user-profile(.*)']);
  
  // Create Clerk middleware wrapper that handles route protection
  const clerkHandler = clerkMiddleware(async (auth, req) => {
    const pathname = req.nextUrl.pathname;
    
    // Handle OPTIONS requests
    if (req.method === "OPTIONS") {
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
    if (isProtectedRoute(req)) {
      await auth.protect();
      
      // For admin routes, check admin status
      // Note: Admin check requires looking up user in our database
      // Since Clerk users might have different IDs, we check by email
      if (pathname.startsWith("/adminx")) {
        const authResult = await auth();
        const userId = authResult.userId;
        if (userId) {
          try {
            // Use Clerk Backend API to get user email
            const { clerkClient } = await import("@clerk/nextjs/server");
            const client = await clerkClient();
            const clerkUser = await client.users.getUser(userId);
            
            if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
              const email = clerkUser.emailAddresses[0].emailAddress;
              
              // Check admin status by email in our database
              const { db } = await import("@/lib/db");
              const { user } = await import("@/lib/db/schema");
              const { eq } = await import("drizzle-orm");
              
              const userRecord = await db()
                .select({ role: user.role })
                .from(user)
                .where(eq(user.email, email))
                .limit(1);
              
              if (userRecord.length === 0 || userRecord[0].role !== "site-admin") {
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
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "*");
    
    return response;
  });
  
  // Call the Clerk middleware handler with the request and event
  // Note: event is always provided at runtime in Next.js middleware, but TypeScript marks it as optional
  return await clerkHandler(request, event as NextFetchEvent);
}

async function authkitWrappedMiddleware(request: NextRequest) {
  // Dynamic import - only loads when AuthKit is active
  const { authkit } = await import("@workos-inc/authkit-nextjs");
  const { getSiteAdminStatus } = await import("@/lib/auth-utils");
  
  const pathname = request.nextUrl.pathname;
  
  // Handle OPTIONS requests
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
  
  // Use AuthKit function for session management
  const {
    session,
    headers: authkitHeaders,
    authorizationUrl,
  } = await authkit(request);
  
  // Check if the route is protected (dashboard and user-profile)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/user-profile")) {
    if (!session?.user) {
      // Redirect to sign-in if no session
      const response = NextResponse.redirect(new URL(authorizationUrl || "/sign-in", request.url));
      
      // Forward AuthKit headers (especially Set-Cookie)
      for (const [key, value] of Array.from(authkitHeaders.entries())) {
        if (key.toLowerCase() === "set-cookie") {
          response.headers.append(key, value);
        } else {
          response.headers.set(key, value);
        }
      }
      
      // Add CORS headers
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "*");
      
      return response;
    }
  }

  // Check if the route is admin portal
  if (pathname.startsWith("/adminx")) {
    if (!session?.user) {
      // Redirect to sign-in if no session
      const response = NextResponse.redirect(new URL(authorizationUrl || "/sign-in", request.url));
      
      // Forward AuthKit headers
      for (const [key, value] of Array.from(authkitHeaders.entries())) {
        if (key.toLowerCase() === "set-cookie") {
          response.headers.append(key, value);
        } else {
          response.headers.set(key, value);
        }
      }
      
      // Add CORS headers
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "*");
      
      return response;
    }

    // Check admin status using unified auth to get user ID
    const { auth } = await import("@/lib/auth");
    const { headers: nextHeaders } = await import("next/headers");
    const unifiedSession = await auth.api.getSession({
      headers: await nextHeaders(),
    });

    if (!unifiedSession) {
      const response = NextResponse.redirect(new URL(authorizationUrl || "/sign-in", request.url));
      
      // Forward AuthKit headers
      for (const [key, value] of Array.from(authkitHeaders.entries())) {
        if (key.toLowerCase() === "set-cookie") {
          response.headers.append(key, value);
        } else {
          response.headers.set(key, value);
        }
      }
      
      // Add CORS headers
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "*");
      
      return response;
    }

    const isAdmin = await getSiteAdminStatus(unifiedSession.user.id);
    if (!isAdmin) {
      const response = new NextResponse(null, { status: 404 });
      
      // Forward AuthKit headers
      for (const [key, value] of Array.from(authkitHeaders.entries())) {
        if (key.toLowerCase() === "set-cookie") {
          response.headers.append(key, value);
        } else {
          response.headers.set(key, value);
        }
      }
      
      // Add CORS headers
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "*");
      
      return response;
    }
  }
  
  // Forward request with AuthKit headers and add CORS headers
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  
  // Forward AuthKit headers (especially Set-Cookie for session management)
  for (const [key, value] of Array.from(authkitHeaders.entries())) {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append(key, value);
    } else {
      response.headers.set(key, value);
    }
  }
  
  // Add CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "*");
  
  return response;
}

export async function middleware(request: NextRequest, event?: NextFetchEvent) {
  const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

  // If Clerk is the provider, use clerkMiddleware to set up auth context
  // This is required for Clerk's auth() helper to work properly
  if (authProvider === "clerk-dev") {
    return clerkWrappedMiddleware(request, event);
  }

  // If AuthKit is the provider, use authkitMiddleware for session management
  if (authProvider === "authkit") {
    return authkitWrappedMiddleware(request);
  }

  // For other providers, use existing unified middleware
  return unifiedAuthMiddleware(request);
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
