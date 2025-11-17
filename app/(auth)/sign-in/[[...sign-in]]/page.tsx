"use client"
import PageWrapper from "@/components/Container/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await authClient.signIn.email({
                email,
                password,
            });
            
            toast.success("Signed in successfully!");
            router.push("/dashboard");
            router.refresh();
        } catch (error: any) {
            toast.error(error?.message || "Failed to sign in. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageWrapper>
            <div className="flex min-w-screen justify-center my-[5rem]">
                <Card className="w-[400px]">
                    <CardHeader>
                        <CardTitle>Sign In</CardTitle>
                        <CardDescription>
                            Enter your email and password to sign in to your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Signing in..." : "Sign In"}
                            </Button>
                        </form>
                        <div className="mt-4 text-center text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href="/sign-up" className="underline">
                                Sign up
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageWrapper>
    );
}