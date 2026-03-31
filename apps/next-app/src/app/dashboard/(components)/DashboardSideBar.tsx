"use client";

import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { Separator } from "@/components/ui/separator";
import clsx from "clsx";
import { CreditCard, Folder, HomeIcon, Settings } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function DashboardSideBar() {
  const pathname = usePathname();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;

  // Build dynamic URLs based on current workspace/project
  const homeUrl =
    workspaceSlug && projectSlug
      ? `/dashboard/${workspaceSlug}/${projectSlug}`
      : "/dashboard";
  const financeUrl =
    workspaceSlug && projectSlug
      ? `/dashboard/${workspaceSlug}/${projectSlug}/finance`
      : "/dashboard";
  const settingsUrl = workspaceSlug
    ? `/dashboard/${workspaceSlug}/~/settings`
    : "/dashboard";
  const billingUrl = workspaceSlug
    ? `/dashboard/${workspaceSlug}/~/settings/billing`
    : "/dashboard";

  // Check active states
  const isHomeActive =
    pathname === homeUrl ||
    pathname === `/dashboard/${workspaceSlug}/${projectSlug}`;
  const isFinanceActive = pathname === financeUrl;
  const isSettingsActive =
    pathname === settingsUrl || pathname.startsWith(`${settingsUrl}/`);
  const isBillingActive = pathname === billingUrl;

  return (
    <div className="hidden h-screen border-r lg:sticky lg:top-0 lg:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[55px] w-full shrink-0 items-center justify-between border-b px-3">
          <WorkspaceSwitcher />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            <Link
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                {
                  "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900  transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50":
                    isHomeActive,
                },
              )}
              href={homeUrl}
            >
              <div className="rounded-lg p-1 bg-white dark:bg-black">
                <HomeIcon className="h-3 w-3" />
              </div>
              Home
            </Link>

            <Link
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                {
                  "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900  transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50":
                    isFinanceActive,
                },
              )}
              href={financeUrl}
            >
              <div className="rounded-lg p-1 bg-white dark:bg-black">
                <Folder className="h-3 w-3" />
              </div>
              Finance
            </Link>
            <Separator className="my-3" />
            <Link
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                {
                  "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900  transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50":
                    isSettingsActive && !isBillingActive,
                },
              )}
              href={settingsUrl}
              id="onboarding"
            >
              <div className="rounded-lg p-1 bg-white dark:bg-black">
                <Settings className="h-3 w-3" />
              </div>
              Settings
            </Link>
            <Link
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                {
                  "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900  transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50":
                    isBillingActive,
                },
              )}
              href={billingUrl}
            >
              <div className="rounded-lg p-1 bg-white dark:bg-black">
                <CreditCard className="h-3 w-3" />
              </div>
              Billing
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
