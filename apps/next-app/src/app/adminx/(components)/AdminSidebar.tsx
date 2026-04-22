"use client";

import { Separator } from "@/components/ui/separator";
import clsx from "clsx";
import {
  Activity,
  Building2,
  CreditCard,
  DollarSign,
  FolderKanban,
  Layers,
  LayoutDashboard,
  Package,
  Plug,
  Settings,
  Shield,
  Sliders,
  Tag,
  Ticket,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/adminx/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/adminx/users", icon: Users, label: "Users" },
    { href: "/adminx/organizations", icon: Building2, label: "Organizations" },
    { href: "/adminx/projects", icon: FolderKanban, label: "Projects" },
    { href: "/adminx/members", icon: UserCog, label: "Members" },
    { href: "/adminx/payments", icon: CreditCard, label: "Payments" },
    { href: "/adminx/sessions", icon: Activity, label: "Sessions" },
    { href: "/adminx/integrations", icon: Plug, label: "Integrations" },
    { href: "/adminx/settings", icon: Settings, label: "Settings" },
  ];

  const stripeItems = [
    { href: "/adminx/stripe/products", icon: Package, label: "Products" },
    { href: "/adminx/stripe/prices", icon: DollarSign, label: "Prices" },
    { href: "/adminx/stripe/coupons", icon: Ticket, label: "Coupons" },
    { href: "/adminx/stripe/promo-codes", icon: Tag, label: "Promo Codes" },
  ];

  const billingItems = [
    {
      href: "/adminx/billing/plan-features",
      icon: Layers,
      label: "Plan Features",
    },
    {
      href: "/adminx/billing/org-features",
      icon: Shield,
      label: "Org Overrides",
    },
    { href: "/adminx/billing/settings", icon: Sliders, label: "App Settings" },
  ];

  const renderNavItem = (item: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => {
    const Icon = item.icon;
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        className={clsx(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
          {
            "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50":
              isActive,
          },
        )}
        href={item.href}
      >
        <div className="rounded-lg p-1 bg-white dark:bg-black">
          <Icon className="h-3 w-3" />
        </div>
        {item.label}
      </Link>
    );
  };

  return (
    <div className="lg:block hidden border-r h-full">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[55px] items-center justify-between border-b px-3 w-full">
          <Link href="/adminx/dashboard" className="font-semibold">
            Admin Portal
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            {navItems.map(renderNavItem)}

            <Separator className="my-3" />
            <div className="px-3 py-2">
              <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Stripe Management
              </h2>
            </div>

            {stripeItems.map(renderNavItem)}

            <Separator className="my-3" />
            <div className="px-3 py-2">
              <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Billing Config
              </h2>
            </div>

            {billingItems.map(renderNavItem)}
          </nav>
        </div>
      </div>
    </div>
  );
}
