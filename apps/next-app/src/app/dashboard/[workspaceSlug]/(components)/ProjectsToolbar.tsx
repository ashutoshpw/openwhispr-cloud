"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

export type ViewMode = "grid" | "list";

interface ProjectsToolbarProps {
  workspaceSlug: string;
  search: string;
  onSearchChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ProjectsToolbar({
  workspaceSlug,
  search,
  onSearchChange,
  view,
  onViewChange,
}: ProjectsToolbarProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects…"
          className="pl-9"
          aria-label="Search projects"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Filter"
        title="Filter (coming soon)"
        disabled
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      <div
        aria-label="View mode"
        className="inline-flex items-center rounded-md border bg-background p-0.5"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", view === "grid" && "bg-accent")}
          aria-pressed={view === "grid"}
          aria-label="Grid view"
          onClick={() => onViewChange("grid")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", view === "list" && "bg-accent")}
          aria-pressed={view === "list"}
          aria-label="List view"
          onClick={() => onViewChange("list")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      <Button asChild>
        <Link
          href={`/dashboard/${encodeURIComponent(workspaceSlug)}/~/projects/new`}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Link>
      </Button>
    </div>
  );
}
