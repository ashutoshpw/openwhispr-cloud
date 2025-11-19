import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function getOrganization(id: string) {
  try {
    const [org] = await db()
      .select()
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1);
    return org || null;
  } catch (error) {
    console.error("Error fetching organization:", error);
    return null;
  }
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getOrganization(id);

  if (!organization) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Details</h1>
          <p className="text-muted-foreground">
            View and edit organization information
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/adminx/organizations">Back to Organizations</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">ID</label>
            <p className="font-mono text-sm">{organization.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p>{organization.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Slug</label>
            <p className="font-mono">{organization.slug}</p>
          </div>
          {organization.logo && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Logo
              </label>
              <p>{organization.logo}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Created At
            </label>
            <p>{new Date(organization.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Updated At
            </label>
            <p>{new Date(organization.updatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

