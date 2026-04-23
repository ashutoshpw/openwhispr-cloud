import Script from "next/script";
import type { ReactNode } from "react";

interface TLDRProps {
  children: ReactNode;
}

export function TLDR({ children }: TLDRProps) {
  return (
    <aside
      aria-label="TL;DR summary"
      className="my-6 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-800 dark:bg-blue-950/40"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        TL;DR
      </p>
      <div className="text-sm leading-relaxed text-blue-900 dark:text-blue-100 [&>p]:mb-0">
        {children}
      </div>
    </aside>
  );
}

interface SourceItem {
  href: string;
  title: string;
}

interface SourcesProps {
  items: SourceItem[];
}

export function Sources({ items }: SourcesProps) {
  if (!items?.length) return null;
  return (
    <footer
      aria-label="Sources"
      className="mt-8 border-t border-gray-200 pt-4 dark:border-gray-700"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Sources
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        {items.map((item) => (
          <li
            key={item.href}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900 dark:hover:text-gray-100"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </footer>
  );
}

interface JsonLdProps {
  id?: string;
  data: Record<string, unknown>;
}

// JSON-LD structured data for AI/search indexing. next/script with
// type="application/ld+json" is the recommended safe pattern (no
// dangerouslySetInnerHTML — the id lets multiple blocks coexist).
export function JsonLd({ id, data }: JsonLdProps) {
  return (
    <Script
      id={id ?? "jsonld"}
      type="application/ld+json"
      strategy="beforeInteractive"
    >
      {JSON.stringify(data)}
    </Script>
  );
}
