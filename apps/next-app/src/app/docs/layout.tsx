import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { docsSource } from "@/lib/source";
import "fumadocs-ui/style.css";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout tree={docsSource.getPageTree()} nav={{ title: "Docs" }}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
