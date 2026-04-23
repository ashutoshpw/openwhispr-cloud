"use client";

import { useSidebar } from "@/components/dashboard/sidebar-context";
import { SidebarUserMenu } from "@/components/dashboard/sidebar-user-menu";
import { Separator } from "@/components/ui/separator";
import {
  type AdminNavItem,
  type AdminNavSection,
  adminxNav,
} from "@/lib/adminx-navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

function isHrefActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavItem({
  item,
  active,
}: {
  item: AdminNavItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50",
        active &&
          "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
      )}
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
  section: AdminNavSection;
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

function SidebarSection({
  section,
  pathname,
  onDrillDown,
}: {
  section: AdminNavSection;
  pathname: string;
  onDrillDown: (id: string) => void;
}) {
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
      {section.items.map((item) => (
        <SidebarNavItem
          key={item.href}
          item={item}
          active={isHrefActive(pathname, item.href)}
        />
      ))}
    </div>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { activeMenuId, setActiveMenuId } = useSidebar();

  const activeDrillSection = useMemo(
    () => adminxNav.main.find((s) => s.id && s.id === activeMenuId) ?? null,
    [activeMenuId],
  );

  const userDismissedRef = useRef(false);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      userDismissedRef.current = false;
      prevPathnameRef.current = pathname;
    }
    if (activeMenuId) return;
    if (userDismissedRef.current) return;
    for (const section of adminxNav.main) {
      if (!section.id || !section.children) continue;
      for (const child of section.children) {
        if (isHrefActive(pathname, child.href)) {
          setActiveMenuId(section.id);
          return;
        }
      }
    }
  }, [pathname, activeMenuId, setActiveMenuId]);

  const handleBack = () => {
    userDismissedRef.current = true;
    setActiveMenuId(null);
  };

  return (
    <div className="hidden h-screen border-r border-neutral-200/70 bg-neutral-100/60 lg:sticky lg:top-0 lg:block overflow-hidden dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[55px] w-full shrink-0 items-center border-b border-neutral-100 px-4 dark:border-neutral-800">
          <Link href="/adminx/dashboard" className="font-semibold">
            Admin Portal
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="relative h-full overflow-hidden">
            <div
              className={cn(
                "transition-transform duration-200 ease-in-out",
                activeMenuId ? "-translate-x-full" : "translate-x-0",
              )}
            >
              <nav className="grid items-start px-2 text-sm font-normal">
                {adminxNav.main.map((section) => (
                  <SidebarSection
                    key={section.id || section.title || "top"}
                    section={section}
                    pathname={pathname}
                    onDrillDown={setActiveMenuId}
                  />
                ))}
                {adminxNav.bottom.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    {adminxNav.bottom.map((item) => (
                      <SidebarNavItem
                        key={item.href}
                        item={item}
                        active={isHrefActive(pathname, item.href)}
                      />
                    ))}
                  </>
                )}
              </nav>
            </div>

            <div
              className={cn(
                "absolute inset-0 transition-transform duration-200 ease-in-out",
                activeMenuId ? "translate-x-0" : "translate-x-full",
              )}
            >
              {activeDrillSection && (
                <nav className="grid items-start px-2 text-sm font-normal">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-normal text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 mb-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {activeDrillSection.title}
                  </button>
                  <Separator className="mb-2" />
                  {(() => {
                    const children = activeDrillSection.children ?? [];
                    const matches = children.filter((item) =>
                      isHrefActive(pathname, item.href),
                    );
                    const activeHref =
                      matches.length > 0
                        ? matches.reduce((a, b) =>
                            b.href.length > a.href.length ? b : a,
                          ).href
                        : null;
                    return children.map((item) => (
                      <SidebarNavItem
                        key={item.href}
                        item={item}
                        active={item.href === activeHref}
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
