import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { member, organization, project } from "@repo/database/schema";
import { FolderOpen, Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const [org] = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, workspaceSlug))
    .limit(1);

  if (!org) {
    notFound();
  }

  const [memberRecord] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, org.id),
      ),
    )
    .limit(1);

  if (!memberRecord) {
    notFound();
  }

  const projects = await db()
    .select()
    .from(project)
    .where(eq(project.organizationId, org.id))
    .orderBy(project.createdAt);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${workspaceSlug}/~/projects/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">No projects yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create your first project to get started.
          </p>
          <Button asChild>
            <Link href={`/dashboard/${workspaceSlug}/~/projects/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/${workspaceSlug}/${p.slug}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.isDefault && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        default
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <CardDescription>{p.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
