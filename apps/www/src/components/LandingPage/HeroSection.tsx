"use client";
import { AUTH_SIGN_UP } from "@/lib/auth-host";
import { useSession } from "@repo/auth/client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);
  const ctaHref = isSignedIn ? "/dashboard" : AUTH_SIGN_UP;
  const ctaLabel = isSignedIn ? "Open Dashboard" : "Get Started";

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 via-sky-400 to-sky-300 dark:from-blue-900 dark:via-sky-800 dark:to-sky-700 rounded-b-[3rem] px-6 pt-24 pb-24 w-full">
      <h1 className="scroll-m-20 text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight lg:text-7xl text-center max-w-[1000px] text-white drop-shadow-sm">
        Your voice is 3x faster than your keyboard.
      </h1>
      <p className="mx-auto max-w-[700px] text-white/90 md:text-lg text-center mt-4">
        Open source voice-to-text assistant. Private by design. Write faster in
        every app — synced everywhere with OpenWhispr Cloud.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-full bg-blue-900 hover:bg-blue-800 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors"
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/#pricing"
          className="inline-flex items-center rounded-full bg-white/15 hover:bg-white/25 border border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors"
        >
          See Pricing
        </Link>
      </div>
      <p className="mt-5 text-sm text-white/75">
        Available on macOS, Windows, and Linux
      </p>
    </div>
  );
}
