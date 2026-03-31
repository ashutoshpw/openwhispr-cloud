import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import type { ReactNode } from "react";
import DashboardSideBar from "../(components)/DashboardSideBar";
import DashboardTopNav from "../(components)/DashboardTopNav";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSideBar />
      <DashboardTopNav>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </DashboardTopNav>
    </SidebarProvider>
  );
}
