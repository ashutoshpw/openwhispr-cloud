import { requireOrganizationMembership } from "@/lib/auth/require-membership";
import { listAvailableIntegrations } from "@/lib/integrations/queries";
import { IntegrationsPageShell } from "../(components)/IntegrationsPageShell";
import { MarketplaceView } from "../(components)/MarketplaceView";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function IntegrationsMarketplacePage({
  params,
}: PageProps) {
  const { workspaceSlug } = await params;
  await requireOrganizationMembership(
    workspaceSlug,
    `/dashboard/${workspaceSlug}/~/integrations/marketplace`,
  );

  const available = await listAvailableIntegrations();

  return (
    <IntegrationsPageShell
      workspaceSlug={workspaceSlug}
      activeTab="marketplace"
    >
      <MarketplaceView workspaceSlug={workspaceSlug} integrations={available} />
    </IntegrationsPageShell>
  );
}
