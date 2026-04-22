import { requireOrganizationMembership } from "@/lib/auth/require-membership";
import { BarChart3 } from "lucide-react";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AgentUsagePage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  await requireOrganizationMembership(
    workspaceSlug,
    `/dashboard/${workspaceSlug}/~/agents/usage`,
  );

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-white dark:bg-black p-2 border border-neutral-200 dark:border-neutral-800">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h2 className="font-semibold text-3xl tracking-tight">Agent Usage</h2>
      </div>
      <p className="text-muted-foreground">
        Track token consumption, run counts, and cost across your agents.
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No usage data yet. Metrics will populate as your agents run.
        </p>
      </div>
    </div>
  );
}
