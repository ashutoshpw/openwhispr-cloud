import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
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
  SlidersHorizontal,
  Sparkles,
  Tag,
  Ticket,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
};

export type AdminNavSection = {
  title: string;
  id?: string;
  icon?: LucideIcon;
  items: AdminNavItem[];
  children?: AdminNavItem[];
};

export type AdminNavConfig = {
  main: AdminNavSection[];
  bottom: AdminNavItem[];
};

export const adminxNav: AdminNavConfig = {
  main: [
    {
      title: "",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/adminx/dashboard",
        },
        { label: "Users", icon: Users, href: "/adminx/users" },
        {
          label: "Organizations",
          icon: Building2,
          href: "/adminx/organizations",
        },
        { label: "Projects", icon: FolderKanban, href: "/adminx/projects" },
        { label: "Agents", icon: Bot, href: "/adminx/agents" },
      ],
    },
    {
      id: "billing",
      title: "Billing",
      icon: Wallet,
      items: [],
      children: [
        { label: "Payments", icon: CreditCard, href: "/adminx/payments" },
        { label: "Products", icon: Package, href: "/adminx/stripe/products" },
        { label: "Prices", icon: DollarSign, href: "/adminx/stripe/prices" },
        { label: "Coupons", icon: Ticket, href: "/adminx/stripe/coupons" },
        { label: "Promo Codes", icon: Tag, href: "/adminx/stripe/promo-codes" },
        { label: "Plan Tiers", icon: Tag, href: "/adminx/billing/plan-tiers" },
        {
          label: "Plan Features",
          icon: Layers,
          href: "/adminx/billing/plan-features",
        },
        {
          label: "Org Overrides",
          icon: Shield,
          href: "/adminx/billing/org-features",
        },
      ],
    },
    {
      id: "platform",
      title: "Platform",
      icon: Wrench,
      items: [],
      children: [
        { label: "Members", icon: UserCog, href: "/adminx/members" },
        { label: "Sessions", icon: Activity, href: "/adminx/sessions" },
        { label: "Integrations", icon: Plug, href: "/adminx/integrations" },
        {
          label: "AI Provider",
          icon: Sparkles,
          href: "/adminx/ai-provider",
        },
      ],
    },
    {
      id: "settings",
      title: "Settings",
      icon: Settings,
      items: [],
      children: [
        {
          label: "General",
          icon: SlidersHorizontal,
          href: "/adminx/settings",
        },
        {
          label: "App Settings",
          icon: Sliders,
          href: "/adminx/billing/settings",
        },
      ],
    },
  ],
  bottom: [],
};
