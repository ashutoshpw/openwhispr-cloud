import { and, db, eq, isNull, or } from "@repo/database";
import {
  type Integration,
  type IntegrationInstallation,
  integration,
  integrationInstallation,
} from "@repo/database/schema";

/**
 * Resolve an installation for a given integration slug, with project-first
 * fallback to workspace-scoped install.
 */
export async function resolveInstallation(
  integrationSlug: string,
  scope: { organizationId: string; projectId?: string | null },
): Promise<{
  integration: Integration;
  installation: IntegrationInstallation | null;
} | null> {
  const [intg] = await db()
    .select()
    .from(integration)
    .where(eq(integration.slug, integrationSlug))
    .limit(1);
  if (!intg) return null;

  const projectFilter = scope.projectId
    ? or(
        eq(integrationInstallation.projectId, scope.projectId),
        isNull(integrationInstallation.projectId),
      )
    : isNull(integrationInstallation.projectId);

  const rows = await db()
    .select()
    .from(integrationInstallation)
    .where(
      and(
        eq(integrationInstallation.integrationId, intg.id),
        eq(integrationInstallation.organizationId, scope.organizationId),
        projectFilter,
      ),
    );

  // Prefer project-scoped over workspace-scoped
  const projectScoped = rows.find((r) => r.projectId === scope.projectId);
  const workspaceScoped = rows.find((r) => r.projectId === null);
  return {
    integration: intg,
    installation: projectScoped ?? workspaceScoped ?? null,
  };
}
