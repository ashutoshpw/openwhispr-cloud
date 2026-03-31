import type { ReactNode } from "react";
import DashboardSideBar from "../(components)/DashboardSideBar";
import DashboardTopNav from "../(components)/DashboardTopNav";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <DashboardSideBar />
      <DashboardTopNav>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </DashboardTopNav>
    </div>
  );
}
