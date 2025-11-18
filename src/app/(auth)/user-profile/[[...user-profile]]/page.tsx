"use client";
import PageWrapper from "@/components/Container/PageWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

const UserProfilePage = () => {
  const { data: session } = useSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <PageWrapper>
      <div className="h-full flex items-center justify-center p-9">
        <Card className="w-[600px]">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>
              View and manage your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage
                  src={session.user.image || ""}
                  alt={session.user.name}
                />
                <AvatarFallback className="text-2xl">
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-2xl font-semibold">{session.user.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <p className="text-sm">{session.user.name}</p>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm">{session.user.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Email Verified</Label>
                <p className="text-sm">
                  {session.user.emailVerified ? "Yes" : "No"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Account Created</Label>
                <p className="text-sm">
                  {new Date(session.user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default UserProfilePage;
