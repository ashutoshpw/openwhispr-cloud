"use client";

import { Button } from "@repo/ui/components/button";
import { useEffect } from "react";

/**
 * Interstitial shown when the browser is about to hand a bearer token to the
 * OpenWhispr desktop app via its custom protocol. Auto-attempts the jump and
 * offers a manual button (custom-protocol navigations are best-effort across
 * browsers).
 */
export default function DesktopHandoffPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const goto = params.get("goto");
    if (
      goto?.startsWith("https://openwhispr.com/") ||
      goto?.startsWith("openwhispr://")
    ) {
      window.location.href = goto;
    }
  }, []);

  const goto =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("goto")
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Return to OpenWhispr
      </h1>
      <p className="text-muted-foreground text-sm">
        If the OpenWhispr app didn&apos;t open automatically, use the button
        below. You can close this window afterwards.
      </p>
      {goto ? (
        <Button asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href={goto}>Open OpenWhispr</a>
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">Missing handoff target.</p>
      )}
    </main>
  );
}
