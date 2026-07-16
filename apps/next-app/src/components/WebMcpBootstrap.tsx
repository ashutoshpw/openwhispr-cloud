"use client";

import Script from "next/script";

export function WebMcpBootstrap() {
  return (
    <Script id="webmcp-bootstrap" strategy="afterInteractive">
      {`
        (function () {
          const modelContext = navigator.modelContext;
          if (!modelContext || typeof modelContext.provideContext !== 'function') {
            return;
          }

          modelContext.provideContext({
            tools: [
              {
                name: 'open_blog',
                description: 'Open the public blog index for this starter template.',
                inputSchema: {
                  type: 'object',
                  properties: {}
                },
                execute: async () => ({ url: '/blog' })
              }
            ]
          });
        })();
      `}
    </Script>
  );
}
