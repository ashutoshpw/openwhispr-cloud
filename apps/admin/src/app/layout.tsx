import Provider from "@/app/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { absoluteUrl } from "@/lib/site-config";
import { PostHogProvider } from "@repo/analytics";
import { Analytics } from "@repo/analytics/vercel";
import { Toaster } from "@repo/ui/components/sonner";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenWhispr Admin",
  description: "OpenWhispr administration console",
  metadataBase: new URL(absoluteUrl("/")),
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className} suppressHydrationWarning>
        <PostHogProvider>
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
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
