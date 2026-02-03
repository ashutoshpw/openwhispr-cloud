"use client";
import PageWrapper from "@/components/Container/PageWrapper";
import { Icons } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Inner component that uses Clerk hooks - must call hooks unconditionally
function ClerkAuthSetupInner() {
  // Always call hooks unconditionally (React rules)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useClerk } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getClientInstance, setGlobalClerkClient } = require("@/lib/auth/providers/clerk-dev/client") as typeof import("@/lib/auth/providers/clerk-dev/client");
  
  const clerk = useClerk();
  const client = getClientInstance();
  
  useEffect(() => {
    console.log('[SignUpPage] ClerkAuthSetupInner useEffect - clerk:', !!clerk, 'client:', !!client);
    if (clerk && client) {
      console.log('[SignUpPage] Setting Clerk client on instance and global ref');
      client.setClerkClient(clerk);
      setGlobalClerkClient(clerk);
      console.log('[SignUpPage] Clerk client initialized successfully');
    } else {
      console.warn('[SignUpPage] Clerk client or client instance not available', { clerk: !!clerk, client: !!client });
    }
  }, [clerk, client]);
  
  return null;
}

// Wrapper that conditionally renders based on provider
function ClerkAuthSetup() {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
  console.log('[SignUpPage] ClerkAuthSetup - provider:', provider);
  
  // Only render if Clerk is the provider
  if (provider !== "clerk-dev") {
    console.log('[SignUpPage] ClerkAuthSetup - not Clerk provider, skipping');
    return null;
  }
  
  try {
    console.log('[SignUpPage] ClerkAuthSetup - rendering ClerkAuthSetupInner');
    return <ClerkAuthSetupInner />;
  } catch (error) {
    console.error('[SignUpPage] ClerkAuthSetup - error:', error);
    return null;
  }
}

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign in with Google. Please try again.";
      toast.error(message);
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
    console.log('[SignUpPage] Component mounted - AUTH_PROVIDER:', provider);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
    console.log('[SignUpPage] Form submitted - AUTH_PROVIDER:', provider);
    console.log('[SignUpPage] Form data:', { email, name: name.substring(0, 3) + '***' });

    try {
      console.log('[SignUpPage] Calling signUp.email()...');
      const { data, error } = await signUp.email({
        email,
        password,
        name,
      });

      console.log('[SignUpPage] signUp.email() returned:', { hasData: !!data, hasError: !!error, errorMessage: error?.message });

      if (error) {
        console.error('[SignUpPage] Sign-up error:', error);
        
        // Handle specific error cases with better messages
        let errorMessage = error.message || "Failed to create account. Please try again.";
        
        if (error.code === "MISSING_REQUIREMENTS") {
          const details = (error as any).details;
          if (details?.isCaptchaIssue) {
            errorMessage = "Security verification is processing. Please wait a moment and try again.";
          } else if (details?.missingFields?.length > 0) {
            errorMessage = error.message || `Missing required information. Please check all fields and try again.`;
          } else if (details?.unverifiedFields?.length > 0) {
            errorMessage = error.message || `Verification required. Please complete the verification process.`;
          }
        }
        
        toast.error(errorMessage);
        return;
      }

      console.log('[SignUpPage] Sign-up successful!');
      toast.success("Account created successfully!");
      router.push("/onboarding");
      router.refresh();
    } catch (error: any) {
      console.error('[SignUpPage] Sign-up exception:', error);
      toast.error(
        error?.message || "Failed to create account. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <ClerkAuthSetup />
      <div className="flex justify-center my-[5rem] min-w-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Enter your information to create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-muted-foreground text-xs">
                  Password must be at least 8 characters
                </p>
              </div>
              {process.env.NEXT_PUBLIC_AUTH_PROVIDER === "clerk-dev" && (
                <div id="cl-captcha" style={{ display: 'none' }} aria-hidden="true" />
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                  )}
                  Google
                </Button>
              </>
            )}
            <div className="mt-4 text-sm text-center">
              Already have an account?{" "}
              <Link href="/sign-in" className="underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
