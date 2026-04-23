"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandKbd,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { signOut } from "@repo/auth/client";
import {
  Activity,
  Building2,
  CreditCard,
  DollarSign,
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Package,
  Search,
  Settings,
  Sun,
  Tag,
  Ticket,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function AdminCommandMenu() {
  const [open, setOpen] = useState(false);
  const { setTheme } = useTheme();
  const router = useRouter();

  // Keyboard shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleNavigation = useCallback(
    (path: string) => {
      runCommand(() => router.push(path));
    },
    [router, runCommand],
  );

  const handleSignOut = useCallback(async () => {
    setOpen(false);

    try {
      const result = await signOut();

      if (result?.error) {
        console.error("Sign out error:", result.error);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error during sign out:", error);
      router.push("/");
      router.refresh();
    }
  }, [router]);

  const handleTheme = useCallback(
    (theme: string) => {
      runCommand(() => setTheme(theme));
    },
    [runCommand, setTheme],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-[260px] items-center gap-2 rounded-md border border-neutral-200/70 bg-white/60 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:bg-neutral-900 dark:hover:text-foreground"
        title="Search admin (⌘K)"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Search admin...</span>
        <span className="flex shrink-0 items-center gap-0.5">
          <CommandKbd>⌘</CommandKbd>
          <CommandKbd>K</CommandKbd>
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search admin commands..."
          rightSlot={<CommandKbd>esc</CommandKbd>}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Quick Navigation */}
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleNavigation("/adminx/dashboard")}>
              <LayoutDashboard />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/users")}>
              <Users />
              <span>Users</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/organizations")}
            >
              <Building2 />
              <span>Organizations</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/projects")}>
              <FolderKanban />
              <span>Projects</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/members")}>
              <UserCog />
              <span>Members</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/payments")}>
              <CreditCard />
              <span>Payments</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/sessions")}>
              <Activity />
              <span>Sessions</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/settings")}>
              <Settings />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Stripe Management */}
          <CommandGroup heading="Stripe">
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/products")}
            >
              <Package />
              <span>Products</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/prices")}
            >
              <DollarSign />
              <span>Prices</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/coupons")}
            >
              <Ticket />
              <span>Coupons</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/promo-codes")}
            >
              <Tag />
              <span>Promo Codes</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/products/new")}
            >
              <Package />
              <span>Create new product</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/coupons/new")}
            >
              <Ticket />
              <span>Create new coupon</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                handleNavigation("/adminx/stripe/promo-codes/new")
              }
            >
              <Tag />
              <span>Create new promo code</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Switch Context */}
          <CommandGroup heading="Switch Context">
            <CommandItem onSelect={() => handleNavigation("/dashboard")}>
              <Home />
              <span>Go to user dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/")}>
              <Home />
              <span>Go to home</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Theme */}
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => handleTheme("light")}>
              <Sun />
              <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => handleTheme("dark")}>
              <Moon />
              <span>Dark</span>
            </CommandItem>
            <CommandItem onSelect={() => handleTheme("system")}>
              <Monitor />
              <span>System</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Account */}
          <CommandGroup heading="Account">
            <CommandItem
              onSelect={() => handleNavigation("/auth/user-profile")}
            >
              <User />
              <span>Profile</span>
            </CommandItem>
            <CommandItem onSelect={handleSignOut}>
              <LogOut />
              <span>Sign out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <CommandFooter />
      </CommandDialog>
    </>
  );
}
