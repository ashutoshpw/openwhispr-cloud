"use client";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative gap-2 text-muted-foreground"
        title="Search (Cmd+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline-flex">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">Cmd</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search admin commands..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Quick Navigation */}
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleNavigation("/adminx/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/users")}>
              <Users className="mr-2 h-4 w-4" />
              <span>Users</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/organizations")}
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span>Organizations</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/projects")}>
              <FolderKanban className="mr-2 h-4 w-4" />
              <span>Projects</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/members")}>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Members</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/payments")}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Payments</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/sessions")}>
              <Activity className="mr-2 h-4 w-4" />
              <span>Sessions</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/adminx/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Stripe Management */}
          <CommandGroup heading="Stripe Management">
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/products")}
            >
              <Package className="mr-2 h-4 w-4" />
              <span>Products</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/prices")}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Prices</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/coupons")}
            >
              <Ticket className="mr-2 h-4 w-4" />
              <span>Coupons</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/promo-codes")}
            >
              <Tag className="mr-2 h-4 w-4" />
              <span>Promo Codes</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/products/new")}
            >
              <Package className="mr-2 h-4 w-4" />
              <span>Create New Product</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleNavigation("/adminx/stripe/coupons/new")}
            >
              <Ticket className="mr-2 h-4 w-4" />
              <span>Create New Coupon</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                handleNavigation("/adminx/stripe/promo-codes/new")
              }
            >
              <Tag className="mr-2 h-4 w-4" />
              <span>Create New Promo Code</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Go To Dashboard */}
          <CommandGroup heading="Switch Context">
            <CommandItem onSelect={() => handleNavigation("/dashboard")}>
              <Home className="mr-2 h-4 w-4" />
              <span>Go to User Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation("/")}>
              <Home className="mr-2 h-4 w-4" />
              <span>Go to Home</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Theme */}
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => handleTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => handleTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </CommandItem>
            <CommandItem onSelect={() => handleTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              <span>System</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Account */}
          <CommandGroup heading="Account">
            <CommandItem
              onSelect={() => handleNavigation("/auth/user-profile")}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </CommandItem>
            <CommandItem onSelect={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
