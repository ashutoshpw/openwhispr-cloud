import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  Building2,
  CreditCard,
  DollarSign,
  Filter,
  FolderKanban,
  Gift,
  KeyRound,
  Layers,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Package,
  Plug,
  Quote,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Tag,
  Ticket,
  TrendingUp,
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
        { label: "Pricing Page", icon: Package, href: "/adminx/pricing" },
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
        { label: "Traffic", icon: LineChart, href: "/adminx/analytics" },
        {
          label: "Funnels",
          icon: Filter,
          href: "/adminx/analytics/funnels",
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
