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
import { Building2, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
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
        const result = await response.json();
        
        // BetterAuth returns array directly, not wrapped in data property
        const organizations = Array.isArray(result) ? result : result?.data || [];
        
        if (organizations.length > 0) {
          setWorkspaces(organizations);

          // Set first organization as active if none marked as active
          const active =
            organizations.find((org: any) => org.isActive) || organizations[0];
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

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      const response = await fetch("/api/auth/organization/set-active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: workspaceId,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error?.message || "Failed to switch workspace");
        return;
      }

      const result = await response.json();
      if (result.error) {
        toast.error(result.error.message || "Failed to switch workspace");
        return;
      }

      const workspace = workspaces.find((w) => w.id === workspaceId);
      setActiveWorkspace(workspace);
      toast.success("Workspace switched successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to switch workspace");
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
        <a href="/onboarding">
          <Building2 className="mr-2 h-4 w-4" />
          Create Workspace
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate max-w-[150px]">
              {activeWorkspace.name}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleSwitchWorkspace(workspace.id)}
            className={workspace.id === activeWorkspace.id ? "bg-accent" : ""}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{workspace.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/onboarding" className="cursor-pointer">
            <Building2 className="mr-2 h-4 w-4" />
            Create New Workspace
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
