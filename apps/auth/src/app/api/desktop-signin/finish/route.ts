import { mintBearerToken } from "@repo/auth";
import { getBetterAuthServer } from "@repo/auth/server";
import { NextResponse } from "next/server";

/**
 * Hosted continuation page for the desktop social/SSO handoff.
 *
 * Better Auth's OAuth callback lands here with a valid cookie session. We
 * mint a bearer token for the user and 302 to the desktop callback URL,
 * which deep-links into the app (openwhispr://auth/callback?bearer_token=…).
 */

function deepLinkCallback(desktopCallback: URL, bearerToken: string): string {
  const target = new URL(desktopCallback);
  target.searchParams.set("protocol", "openwhispr");
  target.searchParams.set("bearer_token", bearerToken);
  // Legacy desktop builds read `token` instead.
  target.searchParams.set("token", bearerToken);
  return target.toString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cb = url.searchParams.get("cb") ?? "";
  if (!cb.startsWith("https://openwhispr.com/")) {
    return NextResponse.json(
      { error: { message: "Missing or invalid cb parameter" } },
      { status: 400 },
    );
  }

  const server = getBetterAuthServer();
  const session = await server.getSession(request.headers);
  if (!session?.user?.id) {
    // No session yet — send the user through sign-in first, then return here.
    const signIn = new URL("/auth/sign-in", request.url);
    signIn.searchParams.set("redirect", url.toString());
    return NextResponse.redirect(signIn.toString(), { status: 302 });
  }

  const bearerToken = await mintBearerToken(session.user.id);
  if (!bearerToken) {
    return NextResponse.json(
      { error: { message: "Failed to create session token" } },
      { status: 500 },
    );
  }

  const target = new URL(cb);
  target.searchParams.set("protocol", "openwhispr");
  target.searchParams.set("bearer_token", bearerToken);
  target.searchParams.set("token", bearerToken);

  const page = new URL("/desktop-handoff", request.url);
  page.searchParams.set("goto", target.toString());
  return NextResponse.redirect(page.toString(), { status: 302 });
}

export { deepLinkCallback };
