"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn } from "@repo/auth/client";
import { Github, Mail } from "lucide-react";
import { useState } from "react";

type Linked = { email: boolean; google: boolean; github: boolean };

export function SignInMethodsCard({
  email,
  linked,
  googleEnabled,
  githubEnabled,
}: {
  email: string;
  linked: Linked;
  googleEnabled: boolean;
  githubEnabled: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);

  const connect = async (provider: "google" | "github") => {
    setPending(provider);
    try {
      await signIn.social({
        provider,
        callbackURL: "/account/settings/authentication",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-in Methods</CardTitle>
        <CardDescription>
          Choose how you want to sign in to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          <li className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-xs text-muted-foreground">{email}</div>
              </div>
            </div>
            <Badge variant={linked.email ? "secondary" : "outline"}>
              {linked.email ? "Active" : "Not configured"}
            </Badge>
          </li>

          <li className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <GoogleIcon className="h-5 w-5" />
              <div>
                <div className="text-sm font-medium">Google</div>
                <div className="text-xs text-muted-foreground">
                  {googleEnabled
                    ? linked.google
                      ? "Connected"
                      : "Not connected"
                    : "Disabled by administrator"}
                </div>
              </div>
            </div>
            {googleEnabled ? (
              linked.google ? (
                <Badge variant="secondary">Connected</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending === "google"}
                  onClick={() => connect("google")}
                >
                  {pending === "google" ? "Redirecting..." : "Connect"}
                </Button>
              )
            ) : (
              <Badge variant="outline">Unavailable</Badge>
            )}
          </li>

          <li className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Github className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">GitHub</div>
                <div className="text-xs text-muted-foreground">
                  {githubEnabled
                    ? linked.github
                      ? "Connected"
                      : "Not connected"
                    : "Disabled by administrator"}
                </div>
              </div>
            </div>
            {githubEnabled ? (
              linked.github ? (
                <Badge variant="secondary">Connected</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending === "github"}
                  onClick={() => connect("github")}
                >
                  {pending === "github" ? "Redirecting..." : "Connect"}
                </Button>
              )
            ) : (
              <Badge variant="outline">Unavailable</Badge>
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Google"
    >
      <title>Google</title>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.1-1.6H12z"
      />
    </svg>
  );
}
