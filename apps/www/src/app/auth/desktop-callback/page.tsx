"use client";

import { Button } from "@repo/ui/components/button";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const CALENDAR_PARAM_PREFIXES = ["gcal_", "mcal_"];

function buildDeepLink(
  params: URLSearchParams,
  allowedKeys: (key: string) => boolean,
): string | null {
  const forwarded = new URLSearchParams();
  params.forEach((value, key) => {
    if (allowedKeys(key) && value) {
      forwarded.set(key, value);
    }
  });
  if (forwarded.size === 0) return null;
  return `openwhispr://auth/callback?${forwarded.toString()}`;
}

function DesktopCallbackContent() {
  const searchParams = useSearchParams();

  const deepLink = useMemo(() => {
    const token =
      searchParams.get("bearer_token") ?? searchParams.get("token") ?? "";
    const protocol = searchParams.get("protocol") ?? "";
    if (token && protocol === "openwhispr") {
      return buildDeepLink(searchParams, (key) =>
        ["bearer_token", "token"].includes(key),
      );
    }
    const hasCalendarParams = [...searchParams.keys()].some((key) =>
      CALENDAR_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
    if (hasCalendarParams) {
      return buildDeepLink(searchParams, (key) =>
        CALENDAR_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix)),
      );
    }
    return null;
  }, [searchParams]);

  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!deepLink) return;
    window.location.href = deepLink;
    setAttempted(true);
  }, [deepLink]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Return to OpenWhispr
      </h1>
      {deepLink ? (
        <>
          <p className="text-muted-foreground text-sm">
            If the OpenWhispr app didn&apos;t open automatically, use the button
            below. You can close this window afterwards.
          </p>
          <Button asChild>
            <a href={deepLink}>Open OpenWhispr</a>
          </Button>
          {!attempted && (
            <p className="text-xs text-muted-foreground">
              Waiting for the app to open…
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          This page is opened by your browser during sign-in. Missing callback
          data — please restart sign-in from the OpenWhispr app.
        </p>
      )}
    </main>
  );
}

export default function DesktopCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Return to OpenWhispr
          </h1>
        </main>
      }
    >
      <DesktopCallbackContent />
    </Suspense>
  );
}
