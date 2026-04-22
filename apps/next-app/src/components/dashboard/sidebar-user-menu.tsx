"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@repo/auth/client";
import {
  BookOpen,
  ChevronsUpDown,
  FileText,
  Home,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

export function SidebarUserMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string | undefined;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";
  const image = session?.user?.image ?? "";
  const initial = (name?.[0] || email?.[0] || "U").toUpperCase();

  const settingsHref = workspaceSlug
    ? `/dashboard/${workspaceSlug}/~/settings`
    : "/dashboard";

  const handleSignOut = async () => {
    try {
      await signOut();
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error during sign out:", error);
      router.push("/");
      router.refresh();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={image} alt={name || "User"} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-sm font-medium">
            {name || email || "Account"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-72 p-0">
        <div className="flex items-start gap-3 px-3 py-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={image} alt={name || "User"} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {name || email || "Account"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {email}
            </div>
          </div>
          <Link
            href={settingsHref}
            aria-label="Settings"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-1">
          <DropdownMenuItem
            onClick={() => {
              // TODO: wire up feedback surface
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Feedback</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="flex items-center justify-between focus:bg-transparent"
          >
            <span>Theme</span>
            <div className="flex items-center rounded-full border bg-muted p-0.5">
              {(
                [
                  { value: "system", icon: Monitor, label: "System" },
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                ] as const
              ).map(({ value, icon: Icon, label }) => {
                const active = mounted && theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={label}
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              <span>Home Page</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/changelog">
              <FileText className="mr-2 h-4 w-4" />
              <span>Changelog</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/help">
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>Help</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/docs">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Docs</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
          <div>
            <div className="font-medium">Platform Status</div>
            <div className="text-muted-foreground">All systems normal</div>
          </div>
          <span
            aria-hidden
            className="h-2 w-2 rounded-full bg-emerald-500"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
