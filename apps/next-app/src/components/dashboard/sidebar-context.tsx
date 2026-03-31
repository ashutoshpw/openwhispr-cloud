"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const SidebarContext = createContext<{
  open: boolean;
  toggle: () => void;
}>({ open: true, toggle: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <SidebarContext.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      <div
        className="h-screen overflow-hidden lg:grid"
        style={{
          gridTemplateColumns: open ? "224px minmax(0, 1fr)" : "0px minmax(0, 1fr)",
          transition: "grid-template-columns 300ms ease-in-out",
        }}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
