import { baseServer } from "@repo/auth/server";

export async function POST(request: Request) {
  try {
    // For Better Auth, delegate to its handler which properly handles sign-out
    // Better Auth's handler knows how to clear cookies and invalidate sessions
    const handler = await baseServer.getApiHandler();
    return handler.POST(request);
  } catch (error) {
    const { NextResponse } = await import("next/server");
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
