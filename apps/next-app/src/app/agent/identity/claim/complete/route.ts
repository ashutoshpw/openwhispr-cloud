import { completeClaim } from "@/lib/agent-auth/claims";
import { clientIp } from "@/lib/agent-auth/registrations";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /agent/identity/claim/complete — service-owned form action.
 * The signed-in user confirms the 6-digit user_code; agents never see this.
 * Body: { claim_attempt_token, user_code }.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { claim_attempt_token?: string; user_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "Body must be JSON" },
      { status: 400 },
    );
  }

  const attemptToken = body.claim_attempt_token?.trim();
  const userCode = body.user_code?.trim();
  if (!attemptToken || !userCode) {
    return NextResponse.json(
      {
        error: "invalid_request",
        message: "claim_attempt_token and user_code are required",
      },
      { status: 400 },
    );
  }

  const result = await completeClaim({
    attemptToken,
    userCode,
    userId: session.user.id,
    userEmail: session.user.email,
    ip: clientIp(request),
  });

  if (!result.ok) {
    const status =
      result.error === "forbidden"
        ? 403
        : result.error === "invalid_code"
          ? 400
          : 410;
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status },
    );
  }

  return NextResponse.json({
    success: true,
    registration_id: result.registrationId,
  });
}
