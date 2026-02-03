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
import { ChevronsUpDown, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  organizationId: string;
  isDefault: boolean;
}

interface Organization {
  id: string;
  slug: string;
}

export function ProjectSwitcher() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceSlug) {
        setIsLoading(false);
        return;
      }

      try {
        // First, get the organization by slug
        const orgsResponse = await fetch("/api/auth/organization/list");
        if (!orgsResponse.ok) {
          console.error("Failed to fetch organizations");
          setIsLoading(false);
          return;
        }

        const orgs = await orgsResponse.json();
        const orgList = Array.isArray(orgs) ? orgs : orgs?.data || [];
        const currentOrg = orgList.find(
          (org: Organization & { slug: string }) => org.slug === workspaceSlug,
        );

        if (!currentOrg) {
          console.error("Organization not found for slug:", workspaceSlug);
          setIsLoading(false);
          return;
        }

        setOrganization(currentOrg);

        // Then fetch projects for this organization
        const projectsResponse = await fetch(
          `/api/projects?organizationId=${currentOrg.id}`,
        );
        if (!projectsResponse.ok) {
          console.error("Failed to fetch projects");
          setIsLoading(false);
          return;
        }

        const projectsData = await projectsResponse.json();
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceSlug]);

  const currentProject = projects.find((p) => p.slug === projectSlug);

  if (isLoading) {
    return (
      <Button variant="ghost" className="justify-start gap-2" disabled>
        <FolderKanban className="h-4 w-4" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  if (!workspaceSlug || !organization) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="justify-between gap-2 px-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            <span className="truncate max-w-[120px] hidden sm:inline">
              {currentProject?.name || "Select Project"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} asChild>
            <Link
              href={`/dashboard/${workspaceSlug}/${project.slug}`}
              className={
                project.slug === projectSlug
                  ? "bg-accent cursor-pointer"
                  : "cursor-pointer"
              }
            >
              <FolderKanban className="mr-2 h-4 w-4" />
              <span className="truncate">{project.name}</span>
              {project.isDefault && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Default
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/${workspaceSlug}/~/projects/new`}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
