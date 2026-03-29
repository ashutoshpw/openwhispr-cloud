"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

interface WorkspaceListResponse {
  data?: Workspace[];
}

interface ApiErrorResponse {
  error?: { message?: string };
}

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await fetch("/api/auth/organization/list");
        if (!response.ok) {
          console.error("Failed to fetch workspaces");
          setIsLoading(false);
          return;
        }
        const result: Workspace[] | WorkspaceListResponse =
          await response.json();

        // BetterAuth returns array directly, not wrapped in data property
        const organizations = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : [];

        if (organizations.length > 0) {
          setWorkspaces(organizations);

          // Set first organization as active if none marked as active
          const active =
            organizations.find((org) => org.isActive) || organizations[0];
          setActiveWorkspace(active);
        }
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleSwitchWorkspace = async (workspace: Workspace) => {
    try {
      const response = await fetch("/api/auth/organization/set-active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: workspace.id,
        }),
      });

      if (!response.ok) {
        const result: ApiErrorResponse = await response.json();
        toast.error(result.error?.message || "Failed to switch workspace");
        return;
      }

      const switchResult: ApiErrorResponse = await response.json();
      if (switchResult.error) {
        toast.error(switchResult.error.message || "Failed to switch workspace");
        return;
      }

      setActiveWorkspace(workspace);
      toast.success("Workspace switched successfully");
      router.push(`/dashboard/${encodeURIComponent(workspace.slug)}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to switch workspace";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" className="w-full justify-start" disabled>
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (!activeWorkspace) {
    return (
      <Button variant="ghost" className="w-full justify-start" asChild>
        <a href="/workspace/new">
          <Building2 className="mr-2 h-4 w-4" />
          Create Workspace
        </a>
      </Button>
    );
  }

  const currentWorkspace = activeWorkspace ?? workspaces[0];

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium">
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{currentWorkspace.name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            aria-label="Switch workspace"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSwitchWorkspace(workspace)}
              className={cn(
                "cursor-pointer",
                workspace.id === currentWorkspace.id && "bg-accent",
              )}
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span className="truncate">{workspace.name}</span>
              {workspace.id === currentWorkspace.id ? (
                <Check className="ml-auto h-4 w-4" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/workspace/new" className="cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              Create New Workspace
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
