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
import { authClient } from "@/lib/auth-client";
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
        const orgClient = (authClient as any).organization;
        if (!orgClient || typeof orgClient.list !== "function") {
          console.error("Organization client not available");
          setIsLoading(false);
          return;
        }
        const result = await orgClient.list();
        if (result?.data) {
          setWorkspaces(result.data);

          const active =
            result.data.find((org: any) => org.isActive) || result.data[0];
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
      const orgClient = (authClient as any).organization;
      if (!orgClient || typeof orgClient.setActive !== "function") {
        toast.error("Organization client not available");
        return;
      }
      const result = await orgClient.setActive({
        organizationId: workspaceId,
      });

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
