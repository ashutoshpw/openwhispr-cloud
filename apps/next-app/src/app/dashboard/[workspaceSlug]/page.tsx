import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { member, organization, project } from "@repo/database/schema";
import { and, eq } from "@repo/database";
import { headers } from "next/headers";
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
    redirect("/sign-in");
  }

  // Get the organization by slug
  const [org] = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, workspaceSlug))
    .limit(1);

  if (!org) {
    notFound();
  }

  // Verify user is a member
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

  // Get the default project or first project
  const projects = await db()
    .select()
    .from(project)
    .where(eq(project.organizationId, org.id))
    .orderBy(project.isDefault);

  if (projects.length === 0) {
    // This shouldn't happen, but handle it gracefully
    // Create a default project
    const { nanoid } = await import("nanoid");
    await db().insert(project).values({
      id: nanoid(),
      name: "Default Project",
      slug: "default",
      organizationId: org.id,
      isDefault: true,
    });
    redirect(`/dashboard/${workspaceSlug}/default`);
  }

  // Prefer the default project, otherwise use the first one
  const defaultProject = projects.find((p) => p.isDefault) || projects[0];
  redirect(`/dashboard/${workspaceSlug}/${defaultProject.slug}`);
}
