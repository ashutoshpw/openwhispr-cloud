import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local from monorepo root
config({ path: resolve(__dirname, "../../.env.local") });

export default defineConfig({
  schema: [
    "./src/schema.ts",
    "./src/schema-ext.ts",
    "./src/schema-analytics.ts",
    "./src/schema-notes.ts",
    "./src/schema-workspaces.ts",
    "./src/schema-platform.ts",
  ],
  schemaFilter: ["public", "archived"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
