"use client";

import { CommandMenu } from "@/components/dashboard/command-menu";
import { InvitationBell } from "@/components/dashboard/invitation-bell";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { SidebarUserMenu } from "@/components/dashboard/sidebar-user-menu";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { HomeIcon, PanelLeft, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

export default function DashboardTopNav({ children }: { children: ReactNode }) {
  const { toggle } = useSidebar();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const homeUrl = workspaceSlug ? `/dashboard/${workspaceSlug}` : "/dashboard";
  const settingsUrl = workspaceSlug
    ? `/dashboard/${workspaceSlug}/~/settings`
    : "/dashboard";
  const membersUrl = workspaceSlug
    ? `/dashboard/${workspaceSlug}/~/settings/members`
    : "/dashboard";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-6 lg:h-[55px]">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation menu"
            >
              <HamburgerMenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <Link href="/">
                <SheetTitle>OpenWhispr</SheetTitle>
              </Link>
            </SheetHeader>

            <div className="flex flex-col space-y-3 mt-4">
              <SheetClose asChild>
                <Link href={homeUrl}>
                  <Button variant="outline" className="w-full">
                    <HomeIcon className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </Link>
              </SheetClose>
              <Separator className="my-3" />
              <SheetClose asChild>
                <Link href={settingsUrl}>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href={membersUrl}>
                  <Button variant="outline" className="w-full">
                    <Users className="mr-2 h-4 w-4" />
                    Members
                  </Button>
                </Link>
              </SheetClose>
            </div>
            <div className="mt-auto border-t pt-3">
              <SidebarUserMenu />
            </div>
          </SheetContent>
        </Sheet>

        {/* Sidebar toggle - left side, desktop only */}
        <div className="hidden lg:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggle}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center items-center gap-3 ml-auto">
          <CommandMenu />
          <InvitationBell />
        </div>
      </header>
      {children}
    </div>
  );
}
