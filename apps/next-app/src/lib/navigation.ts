import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  ClipboardList,
  CreditCard,
  Folder,
  HomeIcon,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  segment: string;
};

export type NavSection = {
  title: string;
  id?: string;
  icon?: LucideIcon;
  items: NavItem[];
  children?: NavItem[];
};

export type NavConfig = {
  main: NavSection[];
  bottom: NavItem[];
};

/**
 * Workspace-level navigation (no project selected).
 */
export const workspaceNav: NavConfig = {
  main: [
    {
      title: "",
      items: [{ label: "Home", icon: HomeIcon, segment: "" }],
    },
    {
      id: "agents",
      title: "Agents",
      icon: Bot,
      items: [],
      children: [
        { label: "Tasks", icon: ClipboardList, segment: "~/agents/tasks" },
        { label: "Usage", icon: BarChart3, segment: "~/agents/usage" },
      ],
    },
    {
      id: "settings",
      title: "Settings",
      icon: Settings,
      items: [],
      children: [
        { label: "General", icon: SlidersHorizontal, segment: "~/settings" },
        { label: "Members", icon: Users, segment: "~/settings/members" },
        { label: "Billing", icon: CreditCard, segment: "~/settings/billing" },
      ],
    },
  ],
  bottom: [],
};

/**
 * Project-level navigation (workspace + project selected).
 */
export const projectNav: NavConfig = {
  main: [
    {
      title: "",
      items: [
        { label: "Home", icon: HomeIcon, segment: "" },
        { label: "Finance", icon: Folder, segment: "finance" },
      ],
    },
    {
      id: "agents",
      title: "Agents",
      icon: Bot,
      items: [],
      children: [
        { label: "Tasks", icon: ClipboardList, segment: "~/agents/tasks" },
        { label: "Usage", icon: BarChart3, segment: "~/agents/usage" },
      ],
    },
    {
      id: "settings",
      title: "Settings",
      icon: Settings,
      items: [],
      children: [
        { label: "General", icon: SlidersHorizontal, segment: "settings" },
        { label: "Members", icon: Users, segment: "~/settings/members" },
        { label: "Billing", icon: CreditCard, segment: "~/settings/billing" },
      ],
    },
  ],
  bottom: [],
};

/**
 * Build an absolute href for a NavItem segment.
 *
 * Conventions:
 * - Segments starting with "~/" are workspace-scoped.
 * - Other segments are project-scoped if a project is active, otherwise
 *   they fall back to the workspace root.
 */
export function buildHref(
  workspaceSlug: string,
  projectSlug: string | undefined,
  segment: string,
): string {
  if (segment.startsWith("~/")) {
    return `/dashboard/${workspaceSlug}/${segment}`;
  }
  if (projectSlug) {
    const base = `/dashboard/${workspaceSlug}/${projectSlug}`;
    return segment ? `${base}/${segment}` : base;
  }
  return segment
    ? `/dashboard/${workspaceSlug}/${segment}`
    : `/dashboard/${workspaceSlug}`;
}
