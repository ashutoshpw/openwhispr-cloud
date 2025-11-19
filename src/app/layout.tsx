import Provider from "@/app/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NextChatSDKBootstrap } from "@/components/NextChatSDKBootstrap";
import { baseURL } from "@/../baseUrl";
import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nextjs 16 Starter Template",
  description: "Build your next SAAS product",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <NextChatSDKBootstrap baseUrl={baseURL} />
      </head>
      <body className={GeistSans.className}>
        <Provider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </Provider>
        <Analytics />
      </body>
    </html>
  );
}
