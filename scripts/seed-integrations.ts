#!/usr/bin/env tsx
/**
 * Seed integration registry with built-in integrations.
 * Idempotent: upserts by slug.
 *
 * Run with: bun run seed:integrations
 */

import { resolve } from "node:path";
import { config } from "dotenv";
import { colors } from "./lib/colors";

config({ path: resolve(process.cwd(), ".env.local") });

interface SeedIntegration {
  slug: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  docsUrl?: string;
  status: "active" | "beta" | "deprecated" | "hidden";
  isSystemManaged: boolean;
  configSchema: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

const SEED: SeedIntegration[] = [
  {
    slug: "custom-mcp-server",
    name: "Custom MCP Server",
    description:
      "Connect a custom MCP (Model Context Protocol) server to expose its tools to your agents.",
    category: "tools",
    docsUrl: "https://modelcontextprotocol.io/",
    status: "active",
    isSystemManaged: false,
    configSchema: {
      type: "object",
      required: ["endpointUrl", "authType"],
      properties: {
        endpointUrl: {
          type: "string",
          format: "uri",
          title: "Endpoint URL",
          description: "Full URL to the MCP server endpoint.",
        },
        authType: {
          type: "string",
          enum: ["none", "bearer", "apiKey", "basic"],
          title: "Authentication Type",
          default: "none",
        },
        credentials: {
          type: "string",
          format: "password",
          title: "Credentials",
          description:
            "Bearer token, API key, or 'username:password' for basic auth.",
        },
        headers: {
          type: "object",
          title: "Custom Headers",
          additionalProperties: { type: "string" },
        },
        toolAllowlist: {
          type: "array",
          title: "Tool Allowlist",
          items: { type: "string" },
        },
      },
    },
    metadata: {
      authType: "byo",
      requirements: ["A reachable MCP server endpoint."],
      features: [
        "Stream tool definitions from any MCP-compatible server",
        "Per-installation auth and header overrides",
        "Optional allowlist to restrict tool exposure",
      ],
    },
  },
];

async function main() {
  console.log("");
  console.log(
    `${colors.bold}${colors.cyan}  Integration Registry Seeding${colors.reset}`,
  );
  console.log("");

  const { db } = await import("@repo/database");
  const { integration } = await import("@repo/database/schema");
  const { eq } = await import("@repo/database");
  const { nanoid } = await import("nanoid");

  let created = 0;
  let updated = 0;

  for (const item of SEED) {
    const [existing] = await db()
      .select()
      .from(integration)
      .where(eq(integration.slug, item.slug))
      .limit(1);

    if (existing) {
      await db()
        .update(integration)
        .set({
          name: item.name,
          description: item.description,
          category: item.category,
          iconUrl: item.iconUrl ?? null,
          docsUrl: item.docsUrl ?? null,
          status: item.status,
          isSystemManaged: item.isSystemManaged,
          configSchema: item.configSchema,
          metadata: item.metadata,
        })
        .where(eq(integration.id, existing.id));
      updated++;
      console.log(
        `  ${colors.dim}↻${colors.reset} updated ${colors.cyan}${item.slug}${colors.reset}`,
      );
    } else {
      await db()
        .insert(integration)
        .values({
          id: nanoid(),
          slug: item.slug,
          name: item.name,
          description: item.description,
          category: item.category,
          iconUrl: item.iconUrl ?? null,
          docsUrl: item.docsUrl ?? null,
          status: item.status,
          isSystemManaged: item.isSystemManaged,
          configSchema: item.configSchema,
          metadata: item.metadata,
        });
      created++;
      console.log(
        `  ${colors.green}+${colors.reset} created ${colors.cyan}${item.slug}${colors.reset}`,
      );
    }
  }

  console.log("");
  console.log(
    `${colors.green}  Done.${colors.reset} ${created} created, ${updated} updated.`,
  );
  console.log("");
}

main().catch((error) => {
  console.error(`${colors.red}  Seeding failed:${colors.reset}`, error);
  process.exit(1);
});
