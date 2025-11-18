"use client";
import PageWrapper from "@/components/Container/PageWrapper";
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
import { baseClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = await baseClient.getSession();
      if (!session?.data?.user) {
        router.push("/sign-in");
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/organization/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workspaceName,
          slug: workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        toast.error(
          result.error?.message ||
            "Failed to create workspace. Please try again.",
        );
        return;
      }

      const result = await response.json();

      toast.success("Workspace created successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to create workspace. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex min-w-screen justify-center my-[5rem]">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Create Your Workspace</CardTitle>
            <CardDescription>
              Set up your workspace to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  type="text"
                  placeholder="My Workspace"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  minLength={2}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a name for your workspace
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating workspace..." : "Create Workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
