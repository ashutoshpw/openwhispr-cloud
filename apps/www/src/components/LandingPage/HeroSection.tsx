"use client";
import { useSession } from "@repo/auth/client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BorderBeam } from "../magicui/border-beam";
import { Button } from "../ui/button";
import { AnimatedGradientTextComponent } from "./AnimatedGradientComponent";

const heroStats = [
  { label: "Local models", value: "Whisper + Parakeet" },
  { label: "Cloud sync", value: "Notes everywhere" },
  { label: "Teams", value: "Shared workspaces" },
];

export default function HeroSection() {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);
  const ctaHref = isSignedIn ? "/dashboard" : "/auth/sign-in";
  const ctaLabel = isSignedIn ? "Open Dashboard" : "Get Started";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="my-5">
        <AnimatedGradientTextComponent />
      </div>
      <h1 className="scroll-m-20 text-4xl sm:text-4xl md:text-6xl font-semibold tracking-tight lg:text-6xl text-center max-w-[1000px]">
        Your voice, everywhere.
      </h1>
      <p className="mx-auto max-w-[700px] text-gray-500 md:text-lg text-center mt-2 dark:text-gray-400">
        Private voice-to-text dictation with local Whisper and Parakeet models.
        OpenWhispr Cloud adds sync, shared team spaces, and API access — your
        words stay yours.
      </p>
      <div className="flex gap-3">
        <Link href={ctaHref} className="mt-5">
          <Button className="animate-buttonheartbeat rounded-md bg-blue-600 hover:bg-blue-300 text-sm font-semibold text-white">
            {ctaLabel}
          </Button>
        </Link>
        <Link href="/docs" className="mt-5">
          <Button
            variant="outline"
            className="flex gap-1 text-blue-600 hover:text-blue-600 hover:bg-blue-100"
          >
            Read the Docs
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      <div>
        <div className="relative flex max-w-6xl justify-center overflow-hidden mt-7">
          <div className="relative rounded-xl border bg-white/50 dark:bg-black/50 p-8 sm:p-10 w-[1200px] max-w-full shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border p-5 bg-background"
                >
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{stat.value}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Dictate on desktop, pick up your notes on any device.
            </p>
            <BorderBeam size={250} duration={12} delay={9} />
          </div>
        </div>
      </div>
    </div>
  );
}
