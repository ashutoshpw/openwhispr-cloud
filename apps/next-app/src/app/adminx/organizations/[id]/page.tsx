import { ProjectTable } from "@/components/admin/ProjectTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { organization, project } from "@repo/database/schema";
import Link from "next/link";
import { notFound } from "next/navigation";

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

async function getOrganizationProjects(organizationId: string) {
  try {
    const projects = await db()
      .select()
      .from(project)
      .where(eq(project.organizationId, organizationId));
    return projects;
  } catch (error) {
    console.error("Error fetching organization projects:", error);
    return [];
  }
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [organizationData, projects] = await Promise.all([
    getOrganization(id),
    getOrganizationProjects(id),
  ]);

  if (!organizationData) {
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
            <span className="text-sm font-medium text-muted-foreground block">
              ID
            </span>
            <p className="font-mono text-sm">{organizationData.id}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-muted-foreground block">
              Name
            </span>
            <p>{organizationData.name}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-muted-foreground block">
              Slug
            </span>
            <p className="font-mono">{organizationData.slug}</p>
          </div>
          {organizationData.logo && (
            <div>
              <span className="text-sm font-medium text-muted-foreground block">
                Logo
              </span>
              <p>{organizationData.logo}</p>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-muted-foreground block">
              Created At
            </span>
            <p>{new Date(organizationData.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-muted-foreground block">
              Updated At
            </span>
            <p>{new Date(organizationData.updatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Projects ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectTable projects={projects} showOrganization={false} />
        </CardContent>
      </Card>
    </div>
  );
}
