"use client";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Admin handoff entry point.
 *
 * The desktop opens /handoff#token=<raw>; the fragment never reaches the
 * server, so this client reads it, POSTs it once to /api/admin/handoff, and
 * lands in the console on the session cookie the route sets.
 */

type HandoffState = { phase: "working" } | { phase: "error"; message: string };

function readTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#")) return null;
  for (const pair of hash.slice(1).split("&")) {
    const [key, value] = pair.split("=");
    if (key === "token" && value) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

export default function HandoffPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [state, setState] = useState<HandoffState>({ phase: "working" });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = readTokenFromHash();
    if (!token) {
      setState({
        phase: "error",
        message: "This handoff link has expired or was already used.",
      });
      return;
    }

    // Scrub the token out of the address bar as soon as we have it.
    window.history.replaceState(null, "", window.location.pathname);

    (async () => {
      try {
        const response = await fetch("/api/admin/handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!response.ok) {
          setState({
            phase: "error",
            message: "This handoff link has expired or was already used.",
          });
          return;
        }
        router.replace("/adminx");
        router.refresh();
      } catch {
        setState({
          phase: "error",
          message: "Something went wrong. Please try the link again.",
        });
      }
    })();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      {state.phase === "working" ? (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Signing you in…</CardTitle>
            <CardDescription>
              Validating your handoff link and opening the admin console.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Handoff failed</CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
