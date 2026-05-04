import type { MetadataRoute } from "next";

import { absoluteUrl, getSitemapPaths } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return getSitemapPaths().map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency:
      path === "/" || path === "/blog" || path === "/docs" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
