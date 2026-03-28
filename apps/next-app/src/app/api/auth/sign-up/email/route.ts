import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { identifyServerUser, trackServerEvent } from "@/lib/analytics/server";
import { baseServer } from "@repo/auth/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: { message: "Email, password, and name are required" } },
        { status: 400 },
      );
    }

    const result = await baseServer.signUpEmail({ email, password, name });

    if (result?.error) {
      return NextResponse.json(
        { error: { message: result.error.message, code: result.error.code } },
        { status: 400 },
      );
    }

    // Track user creation in PostHog
    const userId = (result?.data as { user?: { id?: string } })?.user?.id;
    if (userId) {
      await identifyServerUser(userId, {
        email,
        name,
        signup_source: "email",
        signup_date: new Date().toISOString(),
      });

      await trackServerEvent(ANALYTICS_EVENTS.USER_CREATED, userId, {
        email,
        name,
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
