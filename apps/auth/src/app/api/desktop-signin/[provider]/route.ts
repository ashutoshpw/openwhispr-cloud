import { getBetterAuthServer } from "@repo/auth/server";
import { NextResponse } from "next/server";

/**
 * Browser handoff for the desktop app's social sign-in.
 *
 * GET /api/desktop-signin/{provider}?callbackURL=<desktop-callback>
 *
 * The desktop opens this URL in the system browser. We 302 into the IdP with
 * the OAuth state/PKCE cookies scoped to this host; the IdP redirects back to
 * Better Auth's callback, which bounces to our /api/desktop-signin/finish
 * page. That page mints a bearer token and forwards it to the desktop's
 * callbackURL, which deep-links into the app (openwhispr://auth/callback).
 */

const PROVIDERS = new Set(["google", "microsoft", "apple"]);

function finishUrl(request: Request, desktopCallback: string): string {
  const url = new URL("/api/desktop-signin/finish", request.url);
  url.searchParams.set("cb", desktopCallback);
  return url.toString();
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;

  if (!PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: { message: `Unsupported provider: ${provider}` } },
      { status: 400 },
    );
  }

  const requestedCb =
    new URL(request.url).searchParams.get("callbackURL") ?? "";
  if (!requestedCb.startsWith("https://openwhispr.com/")) {
    return NextResponse.json(
      { error: { message: "callbackURL must be an openwhispr.com URL" } },
      { status: 400 },
    );
  }

  const server = getBetterAuthServer();
  const instance = server.getAuthInstance();

  // asResponse so the OAuth state cookies ride on our 302 into the browser jar.
  const response = await instance.api.signInSocial({
    body: {
      provider: provider as "google" | "microsoft" | "apple",
      callbackURL: finishUrl(request, requestedCb),
    },
    asResponse: true,
  });

  const payload = (await response.json()) as {
    url?: string;
    redirect?: boolean;
  };
  if (!payload.url) {
    return NextResponse.json(
      { error: { message: "Failed to start social sign-in" } },
      { status: 502 },
    );
  }

  const redirect = NextResponse.redirect(payload.url, { status: 302 });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    redirect.headers.append("set-cookie", setCookie);
  }
  return redirect;
}
