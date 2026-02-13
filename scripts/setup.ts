#!/usr/bin/env tsx
/**
 * Interactive setup script for configuring .env.local
 * Run with: bun run setup
 *
 * NOTE: This script reads from .auth-provider.lock to determine which
 * auth provider to configure. Run `bun run init-auth` first if not done.
 */

import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { colors } from "./lib/colors";
import { parseEnvFile } from "./lib/env";
import { printHeader } from "./lib/log";
import { confirm, input, select } from "./lib/prompts";
import { configureOptionalAndAdminVariables } from "./setup-env/optional-config";
import { configureProviderSpecificVariables } from "./setup-env/provider-config";
import type { AuthProvider, ChangeInfo, EnvVariable } from "./setup-env/types";

const AUTH_PROVIDER_NAMES: Record<string, string> = {
  "better-auth": "Better Auth (self-hosted)",
  "next-auth": "NextAuth (Auth.js v5)",
  authkit: "AuthKit (WorkOS)",
  clerk: "Clerk (managed auth)",
};

interface LockFile {
  version: string;
  provider: AuthProvider;
  initializedAt: string;
  templateVersion: string;
}

function getAuthProvider(): AuthProvider | null {
  const lockPath = resolve(process.cwd(), ".auth-provider.lock");
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const content = readFileSync(lockPath, "utf-8");
    const lock: LockFile = JSON.parse(content);
    return lock.provider;
  } catch (error) {
    console.error("Error reading .auth-provider.lock:", error);
    return null;
  }
}

function generateSecret(length = 32): string {
  return randomBytes(length).toString("base64");
}

function maskValue(value: string, isSecret = false): string {
  if (!value || value.length === 0) return "(empty)";
  if (!isSecret) return value;
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function printUpdateWarning(key: string, oldValue: string, isSecret = false) {
  const masked = maskValue(oldValue, isSecret);
  console.log(`  ${colors.yellow}Current value: ${masked}${colors.reset}`);
}

function generateEnvContent(variables: EnvVariable[]): string {
  const sections: Record<string, EnvVariable[]> = {};

  for (const variable of variables) {
    if (!sections[variable.section]) {
      sections[variable.section] = [];
    }
    sections[variable.section].push(variable);
  }

  const sectionOrder = [
    "Database",
    "Authentication Provider",
    "BetterAuth",
    "NextAuth",
    "AuthKit",
    "Clerk",
    "Stripe",
    "Upstash",
    "Email",
    "Admin",
    "Other",
  ];

  let content = "";

  for (const sectionName of sectionOrder) {
    const sectionVariables = sections[sectionName];
    if (!sectionVariables || sectionVariables.length === 0) continue;

    content += `# ${"=".repeat(44)}\n`;
    content += `# ${sectionName}\n`;
    content += `# ${"=".repeat(44)}\n`;

    for (const variable of sectionVariables) {
      content += `${variable.key}=${variable.value}\n`;
    }

    content += "\n";
  }

  for (const [sectionName, sectionVariables] of Object.entries(sections)) {
    if (sectionOrder.includes(sectionName) || sectionVariables.length === 0)
      continue;

    content += `# ${"=".repeat(44)}\n`;
    content += `# ${sectionName}\n`;
    content += `# ${"=".repeat(44)}\n`;

    for (const variable of sectionVariables) {
      content += `${variable.key}=${variable.value}\n`;
    }

    content += "\n";
  }

  return `${content.trim()}\n`;
}

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  let existingEnv: Map<string, string> = new Map();
  let isUpdating = false;
  const changes: ChangeInfo[] = [];
  const newVariables: EnvVariable[] = [];

  console.log("");
  console.log(
    `${colors.bold}${colors.magenta}┌${"─".repeat(58)}┐${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.bold}NextJS Starter Kit - Environment Setup${colors.reset}                  ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}                                                          ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.dim}This wizard will help you configure your .env.local${colors.reset}      ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}└${"─".repeat(58)}┘${colors.reset}`,
  );

  if (existsSync(envPath)) {
    console.log("");
    console.log(
      `${colors.yellow}  Found existing .env.local file${colors.reset}`,
    );

    const action = await select({
      message: "What would you like to do?",
      choices: [
        {
          value: "update",
          name: "Update existing (merge new values, preserve others)",
        },
        {
          value: "fresh",
          name: "Start fresh (backup existing file first)",
        },
        { value: "cancel", name: "Cancel setup" },
      ],
    });

    if (action === "cancel") {
      console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
      process.exit(0);
    }

    if (action === "fresh") {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = resolve(
        process.cwd(),
        `.env.local.backup.${timestamp}`,
      );
      copyFileSync(envPath, backupPath);
      console.log(
        `\n${colors.green}  Backed up to: ${backupPath}${colors.reset}`,
      );
    } else {
      isUpdating = true;
      const content = readFileSync(envPath, "utf-8");
      existingEnv = parseEnvFile(content);
    }
  }

  printHeader("DATABASE CONFIGURATION");

  console.log(
    `${colors.dim}  Tip: Get a free PostgreSQL database at ${colors.cyan}https://neon.tech${colors.reset}`,
  );
  console.log("");

  const existingDbUrl = existingEnv.get("DATABASE_URL");
  if (existingDbUrl && isUpdating) {
    printUpdateWarning("DATABASE_URL", existingDbUrl);
  }

  const databaseUrl = await input({
    message: "Database URL:",
    default:
      existingDbUrl ||
      "postgresql://postgres:postgres@localhost:5432/nextjs_starter",
  });

  if (isUpdating && existingDbUrl && existingDbUrl !== databaseUrl) {
    changes.push({
      key: "DATABASE_URL",
      oldValue: existingDbUrl,
      newValue: databaseUrl,
    });
  }

  newVariables.push({
    key: "DATABASE_URL",
    value: databaseUrl,
    section: "Database",
  });

  printHeader("AUTHENTICATION PROVIDER");

  const authProvider = getAuthProvider();

  if (!authProvider) {
    console.log(`${colors.red}  No auth provider initialized!${colors.reset}`);
    console.log("");
    console.log(
      `${colors.yellow}  Please run: ${colors.bold}bun run init-auth${colors.reset}`,
    );
    console.log(
      `${colors.dim}  This will initialize the project with your chosen auth provider.${colors.reset}`,
    );
    console.log("");
    process.exit(1);
  }

  const providerName = AUTH_PROVIDER_NAMES[authProvider] || authProvider;
  console.log(
    `${colors.green}  ✓ Using: ${colors.bold}${providerName}${colors.reset}`,
  );
  console.log(
    `${colors.dim}  (Set by init-auth - this cannot be changed)${colors.reset}`,
  );
  console.log("");

  const existingAppUrl = existingEnv.get("NEXT_PUBLIC_APP_URL");
  if (existingAppUrl && isUpdating) {
    printUpdateWarning("NEXT_PUBLIC_APP_URL", existingAppUrl);
  }

  const appUrl = await input({
    message: "App URL:",
    default: existingAppUrl || "http://localhost:8801",
  });

  if (isUpdating && existingAppUrl && existingAppUrl !== appUrl) {
    changes.push({
      key: "NEXT_PUBLIC_APP_URL",
      oldValue: existingAppUrl,
      newValue: appUrl,
    });
  }

  newVariables.push({
    key: "NEXT_PUBLIC_APP_URL",
    value: appUrl,
    section: "Authentication Provider",
  });

  await configureProviderSpecificVariables({
    authProvider,
    appUrl,
    existingEnv,
    isUpdating,
    newVariables,
    changes,
    generateSecret,
    printUpdateWarning,
  });

  await configureOptionalAndAdminVariables({
    existingEnv,
    isUpdating,
    newVariables,
    changes,
    printUpdateWarning,
  });

  if (isUpdating) {
    const configuredKeys = new Set(
      newVariables.map((variable) => variable.key),
    );
    existingEnv.forEach((value, key) => {
      if (!configuredKeys.has(key)) {
        newVariables.push({
          key,
          value,
          section: "Other",
        });
      }
    });
  }

  printHeader("SUMMARY");

  console.log(`  ${colors.bold}Variables to be written:${colors.reset}`);
  console.log("");

  const secretKeys = [
    "BETTER_AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_SECRET",
    "WORKOS_API_KEY",
    "WORKOS_COOKIE_PASSWORD",
    "CLERK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "UPSTASH_REDIS_REST_TOKEN",
    "RESEND_API_KEY",
    "ADMIN_PASSWORD",
  ];

  for (const variable of newVariables) {
    const isSecret = secretKeys.includes(variable.key);
    const displayValue = maskValue(variable.value, isSecret);
    const change = changes.find((item) => item.key === variable.key);

    if (change) {
      console.log(
        `  ${colors.yellow}⚡${colors.reset} ${variable.key} ${colors.dim}(updated)${colors.reset}`,
      );
    } else {
      console.log(
        `  ${colors.green}✓${colors.reset} ${variable.key} = ${colors.dim}${displayValue}${colors.reset}`,
      );
    }
  }

  if (changes.length > 0) {
    console.log("");
    console.log(
      `  ${colors.yellow}${changes.length} variable(s) will be updated${colors.reset}`,
    );
  }

  console.log("");

  const shouldWrite = await confirm({
    message: "Write .env.local?",
    default: true,
  });

  if (!shouldWrite) {
    console.log(
      `\n${colors.dim}Setup cancelled. No files were modified.${colors.reset}`,
    );
    process.exit(0);
  }

  const content = generateEnvContent(newVariables);
  writeFileSync(envPath, content, "utf-8");

  console.log("");
  console.log(
    `${colors.green}${colors.bold}  ✅ Successfully wrote .env.local${colors.reset}`,
  );
  console.log("");
  console.log(`${colors.bold}  Next steps:${colors.reset}`);
  console.log(
    `    1. ${colors.cyan}bun run db:push${colors.reset}    - Sync database schema`,
  );
  console.log(
    `    2. ${colors.cyan}bun run db:seed${colors.reset}    - Create admin user (if configured)`,
  );
  console.log(
    `    3. ${colors.cyan}bun run dev${colors.reset}        - Start development server`,
  );
  console.log("");
  console.log(`${colors.bold}  Available routes:${colors.reset}`);
  console.log(
    `    ${colors.dim}http://localhost:8801${colors.reset}          - Home page`,
  );
  console.log(
    `    ${colors.dim}http://localhost:8801/dashboard${colors.reset} - User dashboard`,
  );
  console.log(
    `    ${colors.dim}http://localhost:8801/adminx${colors.reset}    - Admin portal (requires site-admin role)`,
  );
  console.log("");
}

main().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
    process.exit(0);
  }
  console.error("Setup failed:", error);
  process.exit(1);
});
