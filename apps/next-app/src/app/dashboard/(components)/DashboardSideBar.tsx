"use client";

import { useSidebar } from "@/components/dashboard/sidebar-context";
import { SidebarUserMenu } from "@/components/dashboard/sidebar-user-menu";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { Separator } from "@/components/ui/separator";
import {
  type NavConfig,
  type NavItem,
  type NavSection,
  buildHref,
  projectNav,
  workspaceNav,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

function SidebarNavItem({
  item,
  href,
  active,
}: {
  item: NavItem;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50",
        active &&
          "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
      )}
      href={href}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function DrillDownRow({
  section,
  onClick,
}: {
  section: NavSection;
  onClick: () => void;
}) {
  const Icon = section.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1 text-left">{section.title}</span>
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
}

function isItemActive(pathname: string, href: string, segment: string) {
  if (!segment) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarSection({
  section,
  workspaceSlug,
  projectSlug,
  pathname,
  onDrillDown,
}: {
  section: NavSection;
  workspaceSlug: string;
  projectSlug: string | undefined;
  pathname: string;
  onDrillDown: (id: string) => void;
}) {
  // Drill-down section (has an id and children)
  if (section.id && section.children && section.children.length > 0) {
    return (
      <div className="mb-1">
        <DrillDownRow
          section={section}
          onClick={() => section.id && onDrillDown(section.id)}
        />
      </div>
    );
  }

  return (
    <div className="mb-1">
      {section.title && (
        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {section.title}
        </div>
      )}
      {section.items.map((item) => {
        const href = buildHref(workspaceSlug, projectSlug, item.segment);
        return (
          <SidebarNavItem
            key={item.segment || item.label}
            item={item}
            href={href}
            active={isItemActive(pathname, href, item.segment)}
          />
        );
      })}
    </div>
  );
}

export default function DashboardSideBar() {
  const pathname = usePathname();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string | undefined;
  const { activeMenuId, setActiveMenuId } = useSidebar();

  const config: NavConfig = projectSlug ? projectNav : workspaceNav;

  const activeDrillSection = useMemo(
    () => config.main.find((s) => s.id && s.id === activeMenuId) ?? null,
    [config.main, activeMenuId],
  );

  // Auto-open the drill-down whose children match the current route.
  // Reset the user-dismissed flag when the route changes so we can re-open.
  const userDismissedRef = useRef(false);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      userDismissedRef.current = false;
      prevPathnameRef.current = pathname;
    }
    if (activeMenuId) return;
    if (userDismissedRef.current) return;
    for (const section of config.main) {
      if (!section.id || !section.children) continue;
      for (const child of section.children) {
        const href = buildHref(workspaceSlug, projectSlug, child.segment);
        if (pathname === href || pathname.startsWith(`${href}/`)) {
          setActiveMenuId(section.id);
          return;
        }
      }
    }
  }, [
    pathname,
    config.main,
    workspaceSlug,
    projectSlug,
    activeMenuId,
    setActiveMenuId,
  ]);

  const handleBack = () => {
    userDismissedRef.current = true;
    setActiveMenuId(null);
  };

  return (
    <div className="hidden h-screen border-r border-neutral-200/70 bg-neutral-100/60 lg:sticky lg:top-0 lg:block overflow-hidden dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[55px] w-full shrink-0 items-center border-b border-neutral-100 dark:border-neutral-800">
          <WorkspaceSwitcher />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="relative h-full overflow-hidden">
            {/* Pane A: root menu */}
            <div
              className={cn(
                "transition-transform duration-200 ease-in-out",
                activeMenuId ? "-translate-x-full" : "translate-x-0",
              )}
            >
              <nav className="grid items-start px-2 text-sm font-medium">
                {config.main.map((section) => (
                  <SidebarSection
                    key={section.id || section.title || "top"}
                    section={section}
                    workspaceSlug={workspaceSlug}
                    projectSlug={projectSlug}
                    pathname={pathname}
                    onDrillDown={setActiveMenuId}
                  />
                ))}
                <Separator className="my-3" />
                {config.bottom.map((item) => {
                  const href = buildHref(
                    workspaceSlug,
                    projectSlug,
                    item.segment,
                  );
                  return (
                    <SidebarNavItem
                      key={item.segment}
                      item={item}
                      href={href}
                      active={isItemActive(pathname, href, item.segment)}
                    />
                  );
                })}
              </nav>
            </div>

            {/* Pane B: drill-down */}
            <div
              className={cn(
                "absolute inset-0 transition-transform duration-200 ease-in-out",
                activeMenuId ? "translate-x-0" : "translate-x-full",
              )}
            >
              {activeDrillSection && (
                <nav className="grid items-start px-2 text-sm font-medium">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 mb-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {activeDrillSection.title}
                  </button>
                  <Separator className="mb-2" />
                  {(() => {
                    const childHrefs = (activeDrillSection.children ?? []).map(
                      (item) => ({
                        item,
                        href: buildHref(
                          workspaceSlug,
                          projectSlug,
                          item.segment,
                        ),
                      }),
                    );
                    const matches = childHrefs.filter(
                      ({ href }) =>
                        pathname === href || pathname.startsWith(`${href}/`),
                    );
                    const activeHref =
                      matches.length > 0
                        ? matches.reduce((a, b) =>
                            b.href.length > a.href.length ? b : a,
                          ).href
                        : null;
                    return childHrefs.map(({ item, href }) => (
                      <SidebarNavItem
                        key={item.segment}
                        item={item}
                        href={href}
                        active={href === activeHref}
                      />
                    ));
                  })()}
                </nav>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-100 p-2 dark:border-neutral-800">
          <SidebarUserMenu />
        </div>
      </div>
    </div>
  );
}
