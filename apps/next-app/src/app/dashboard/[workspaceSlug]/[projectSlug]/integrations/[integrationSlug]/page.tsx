import { InstallIntegrationForm } from "@/components/integrations/install-integration-form";
import type { ConfigSchema } from "@/components/integrations/install-integration-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/auth/require-membership";
import { findIntegrationBySlug } from "@/lib/integrations/queries";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    workspaceSlug: string;
    projectSlug: string;
    integrationSlug: string;
  }>;
}

export default async function InstallIntegrationPage({ params }: PageProps) {
  const { workspaceSlug, projectSlug, integrationSlug } = await params;
  const { project } = await requireProjectMembership(
    workspaceSlug,
    projectSlug,
    `/dashboard/${workspaceSlug}/${projectSlug}/integrations/${integrationSlug}`,
  );

  const intg = await findIntegrationBySlug(integrationSlug);
  if (!intg) notFound();

  const baseHref = `/dashboard/${workspaceSlug}/${projectSlug}/integrations`;

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-20 max-w-[800px]">
      <div>
        <h2 className="font-semibold text-3xl tracking-tight">{intg.name}</h2>
        {intg.description && (
          <p className="text-muted-foreground mt-1">{intg.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Install for this project</CardTitle>
        </CardHeader>
        <CardContent>
          <InstallIntegrationForm
            integrationSlug={intg.slug}
            integrationName={intg.name}
            configSchema={intg.configSchema as ConfigSchema | null}
            installEndpoint={`/api/projects/${project.id}/installations`}
            successHrefBase={baseHref}
            defaultDisplayName={intg.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
