import { baseServer } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getProviderName } from "@repo/auth/config";

export async function POST(request: Request) {
  try {
    const providerName = getProviderName();

    // For better-auth, delegate to its handler which properly handles sign-out
    // Better-auth's handler knows how to clear cookies and invalidate sessions
    if (providerName === "better-auth") {
      const handler = await baseServer.getApiHandler();
      return handler.POST(request);
    }

    // For Clerk, use server-side signOut which revokes session and syncs DB
    if (providerName === "clerk-dev") {
      const result = await baseServer.signOut();

      if (result?.error) {
        return NextResponse.json(
          { error: { message: result.error.message, code: result.error.code } },
          { status: 400 },
        );
      }

      return NextResponse.json({});
    }

    // For Next-Auth, delete session from DB before Next-Auth clears JWT cookie
    if (providerName === "next-auth") {
      const cookieHeader = request.headers.get("cookie") || "";
      const { deleteNextAuthSessionFromDb } = await import(
        "@/lib/auth/providers/next-auth/db-sync"
      );
      await deleteNextAuthSessionFromDb(cookieHeader);

      const result = await baseServer.signOut();

      if (result?.error) {
        return NextResponse.json(
          { error: { message: result.error.message, code: result.error.code } },
          { status: 400 },
        );
      }

      // Next-Auth's client-side signOut will handle cookie clearing
      return NextResponse.json({});
    }

    // For other providers, use the unified server signOut method
    const result = await baseServer.signOut();

    if (result?.error) {
      return NextResponse.json(
        { error: { message: result.error.message, code: result.error.code } },
        { status: 400 },
      );
    }

    return NextResponse.json({});
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Internal server error",
        },
      },
      { status: 500 },
    );
  }
}
