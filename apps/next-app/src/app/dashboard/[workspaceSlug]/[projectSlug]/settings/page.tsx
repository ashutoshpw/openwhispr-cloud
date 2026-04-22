import { ProjectSettingsForm } from "@/components/projects/project-settings-form";
import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { member, organization, project } from "@repo/database/schema";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceSlug: string; projectSlug: string }>;
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { workspaceSlug, projectSlug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect(
      `/auth/sign-in?redirect=/dashboard/${workspaceSlug}/${projectSlug}/settings`,
    );
  }

  const [org] = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, workspaceSlug))
    .limit(1);

  if (!org) {
    notFound();
  }

  const [membership] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, org.id),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    notFound();
  }

  const [proj] = await db()
    .select()
    .from(project)
    .where(
      and(eq(project.organizationId, org.id), eq(project.slug, projectSlug)),
    )
    .limit(1);

  if (!proj) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-20 max-w-[800px]">
      <div>
        <h2 className="font-semibold text-3xl tracking-tight">
          Project Settings
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage settings for the{" "}
          <span className="font-medium text-foreground">{proj.name}</span>{" "}
          project.
        </p>
      </div>

      <ProjectSettingsForm
        projectId={proj.id}
        initialName={proj.name}
        workspaceSlug={workspaceSlug}
        currentSlug={proj.slug}
      />
    </div>
  );
}
