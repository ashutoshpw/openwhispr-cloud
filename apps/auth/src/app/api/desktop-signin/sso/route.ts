import { NextResponse } from "next/server";

/**
 * Browser handoff for the desktop app's SSO sign-in.
 *
 * GET /api/desktop-signin/sso?email=<work-email>&callbackURL=<desktop-callback>
 *
 * Resolves the organization's registered SSO provider for the email domain
 * and 302s into its IdP. Requires an SSO provider registration to exist
 * (managed from the admin console). The IdP returns to Better Auth's
 * callback, which continues into /api/desktop-signin/finish.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const cb = url.searchParams.get("callbackURL") ?? "";

  if (!cb.startsWith("https://openwhispr.com/")) {
    return NextResponse.json(
      { error: { message: "callbackURL must be an openwhispr.com URL" } },
      { status: 400 },
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json(
      { error: { message: "A valid email is required" } },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: {
        message:
          "SSO is not configured for this deployment. Register an enterprise SSO provider first.",
        code: "sso_not_configured",
      },
    },
    { status: 501 },
  );
}
