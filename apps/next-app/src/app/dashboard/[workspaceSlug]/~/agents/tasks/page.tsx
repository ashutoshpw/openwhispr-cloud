import { requireOrganizationMembership } from "@/lib/auth/require-membership";
import { ClipboardList } from "lucide-react";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AgentTasksPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  await requireOrganizationMembership(
    workspaceSlug,
    `/dashboard/${workspaceSlug}/~/agents/tasks`,
  );

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-white dark:bg-black p-2 border border-neutral-200 dark:border-neutral-800">
          <ClipboardList className="h-5 w-5" />
        </div>
        <h2 className="font-semibold text-3xl tracking-tight">Agent Tasks</h2>
      </div>
      <p className="text-muted-foreground">
        Queue, monitor, and review tasks executed by your agents.
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No tasks yet. Once your agents start running, their tasks will appear
          here.
        </p>
      </div>
    </div>
  );
}
