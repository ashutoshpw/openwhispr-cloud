import { defineCollections, defineConfig } from "fumadocs-mdx/config";
import { z } from "zod";

export const blogCollection = defineCollections({
  type: "doc",
  dir: "./content/blog",
  schema: z.object({
    title: z.string(),
    date: z.string(),
    author: z.string().optional(),
    image: z.string().optional(),
    excerpt: z.string().optional(),
  }),
});

export default defineConfig();
