import type { ReactNode } from "react";
import AdminSidebar from "./(components)/AdminSidebar";
import AdminTopNav from "./(components)/AdminTopNav";
import { ReactQueryProvider } from "@/providers/react-query-provider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <AdminSidebar />
        <AdminTopNav>
          <main className="flex flex-col gap-4 p-4 lg:gap-6">{children}</main>
        </AdminTopNav>
      </div>
    </ReactQueryProvider>
  );
}

