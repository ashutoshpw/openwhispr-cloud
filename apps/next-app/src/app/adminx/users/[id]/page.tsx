import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { user } from "@repo/database/schema";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getUser(id: string) {
  try {
    const [userRecord] = await db()
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return userRecord || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Details</h1>
          <p className="text-muted-foreground">
            View and edit user information
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/adminx/users">Back to Users</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              ID
            </label>
            <p className="font-mono text-sm">{user.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Name
            </label>
            <p>{user.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p>{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Role
            </label>
            <div>
              <Badge
                variant={user.role === "site-admin" ? "default" : "secondary"}
              >
                {user.role}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email Verified
            </label>
            <div>
              <Badge variant={user.emailVerified ? "default" : "outline"}>
                {user.emailVerified ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Created At
            </label>
            <p>{new Date(user.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Updated At
            </label>
            <p>{new Date(user.updatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
