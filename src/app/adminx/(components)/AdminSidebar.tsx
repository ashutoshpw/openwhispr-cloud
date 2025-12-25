"use client";

import { Separator } from "@/components/ui/separator";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCog,
  CreditCard,
  Activity,
  Settings,
  Package,
  DollarSign,
  Ticket,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/adminx/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/adminx/users", icon: Users, label: "Users" },
    { href: "/adminx/organizations", icon: Building2, label: "Organizations" },
    { href: "/adminx/members", icon: UserCog, label: "Members" },
    { href: "/adminx/payments", icon: CreditCard, label: "Payments" },
    { href: "/adminx/sessions", icon: Activity, label: "Sessions" },
    { href: "/adminx/settings", icon: Settings, label: "Settings" },
  ];

  const stripeItems = [
    { href: "/adminx/stripe/products", icon: Package, label: "Products" },
    { href: "/adminx/stripe/prices", icon: DollarSign, label: "Prices" },
    { href: "/adminx/stripe/coupons", icon: Ticket, label: "Coupons" },
    { href: "/adminx/stripe/promo-codes", icon: Tag, label: "Promo Codes" },
  ];

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
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
                  <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white">
                    <Icon className="h-3 w-3" />
                  </div>
                  {item.label}
                </Link>
              );
            })}
            
            <Separator className="my-3" />
            <div className="px-3 py-2">
              <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Stripe Management
              </h2>
            </div>
            
            {stripeItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
                  <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white">
                    <Icon className="h-3 w-3" />
                  </div>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

