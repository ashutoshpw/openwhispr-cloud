import { createHash } from "node:crypto";

import { blog } from "@/lib/source";

const DEFAULT_PRODUCTION_URL = "https://nextjs-starter-kit-app.vercel.app";

export function getSiteUrl(): string {
  const envUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL);

  if (!envUrl) {
    return process.env.NODE_ENV === "development"
      ? "http://localhost:8801"
      : DEFAULT_PRODUCTION_URL;
  }

  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, getSiteUrl()).toString();
}

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

export const publicStaticPaths = [
  "/",
  "/blog",
  "/help",
  "/privacy",
  "/terms",
  "/changelog",
  "/marketing-page",
] as const;

export function getPublicBlogPaths(): string[] {
  return blog.map((post) => `/blog/${post.info.path.replace(/\.mdx$/, "")}`);
}

export function getSitemapPaths(): string[] {
  return [...publicStaticPaths, ...getPublicBlogPaths()];
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
