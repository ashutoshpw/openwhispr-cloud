import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { baseServer } from "@repo/auth/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const bodyData = JSON.parse(body);
    const { email, password } = bodyData;

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: "Email and password are required" } },
        { status: 400 },
      );
    }

    const result = await baseServer.signInEmail({ email, password });

    if (result?.error) {
      return NextResponse.json(
        { error: { message: result.error.message, code: result.error.code } },
        { status: 400 },
      );
    }

    // Track user login in PostHog
    const userId = (result?.data as { user?: { id?: string } })?.user?.id;
    if (userId) {
      await trackServerEvent(ANALYTICS_EVENTS.USER_LOGGED_IN, userId, {
        email,
        provider: "email",
      });
    }

    return NextResponse.json({ data: result?.data });
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
