#!/usr/bin/env tsx
/**
 * Unified setup script: initializes the auth provider AND configures .env.local.
 *
 * Run with:
 *   bun run setup                                       # Interactive
 *   bun run setup --yes --provider=better-auth          # Headless / CI
 *   bun run setup --force --provider=clerk --yes        # Re-init auth (dangerous)
 *
 * See `bun run setup --help` for the full flag and env-var reference.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { colors } from "./lib/colors";
import { parseEnvFile } from "./lib/env";
import { printHeader } from "./lib/log";
import { confirm, input, isAutoMode, select, setAutoMode } from "./lib/prompts";
import { readProviderLock, runAuthPhaseIfNeeded } from "./setup-env/auth-phase";
import {
  AUTH_PROVIDER_NAMES,
  parseArgs,
  printBanner,
  printHelp,
} from "./setup-env/cli";
import {
  ENV_OVERRIDE_KEYS,
  SECRET_KEYS,
  commitAndTag,
  envOverridesFromProcess,
  generateEnvContent,
  generateSecret,
  maskValue,
  printUpdateWarning,
  restoreRootDevScript,
  syncDevPort,
} from "./setup-env/env-helpers";
import { configureOptionalAndAdminVariables } from "./setup-env/optional-config";
import { configureProviderSpecificVariables } from "./setup-env/provider-config";
import type { ChangeInfo, EnvVariable } from "./setup-env/types";

async function loadExistingEnv(envPath: string): Promise<{
  existingEnv: Map<string, string>;
  isUpdating: boolean;
}> {
  let existingEnv: Map<string, string> = new Map();
  let isUpdating = false;

  if (!existsSync(envPath)) return { existingEnv, isUpdating };

  console.log("");
  console.log(
    `${colors.yellow}  Found existing .env.local file${colors.reset}`,
  );

  const action = isAutoMode()
    ? "update"
    : await select<string>({
        message: "What would you like to do?",
        choices: [
          {
            value: "update",
            name: "Update existing (merge new values, preserve others)",
          },
          { value: "fresh", name: "Start fresh (backup existing file first)" },
          { value: "cancel", name: "Cancel setup" },
        ],
      });

  if (action === "cancel") {
    console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
    process.exit(0);
  }

  if (action === "fresh") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = resolve(process.cwd(), `.env.local.backup.${timestamp}`);
    copyFileSync(envPath, backupPath);
    console.log(
      `\n${colors.green}  Backed up to: ${backupPath}${colors.reset}`,
    );
  } else {
    isUpdating = true;
    existingEnv = parseEnvFile(readFileSync(envPath, "utf-8"));
  }

  return { existingEnv, isUpdating };
}

function applyEnvOverrides(
  existingEnv: Map<string, string>,
  isUpdating: boolean,
): boolean {
  const overrides = envOverridesFromProcess(ENV_OVERRIDE_KEYS);
  if (overrides.size === 0) return isUpdating;
  overrides.forEach((value, key) => existingEnv.set(key, value));
  return true;
}

function printSummary(
  newVariables: EnvVariable[],
  changes: ChangeInfo[],
): void {
  printHeader("SUMMARY");
  console.log(`  ${colors.bold}Variables to be written:${colors.reset}`);
  console.log("");

  for (const variable of newVariables) {
    const isSecret = SECRET_KEYS.includes(variable.key);
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
}

function printNextSteps(): void {
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
}

async function main() {
  const flags = parseArgs();

  if (flags.help) {
    printHelp();
    return;
  }

  setAutoMode(flags.yes);
  printBanner();

  // Phase 1: auth provider initialization
  await runAuthPhaseIfNeeded(flags.provider, flags.force);

  // Phase 2: .env.local configuration
  const envPath = resolve(process.cwd(), ".env.local");
  let { existingEnv, isUpdating } = await loadExistingEnv(envPath);
  const changes: ChangeInfo[] = [];
  const newVariables: EnvVariable[] = [];

  if (isAutoMode()) {
    isUpdating = applyEnvOverrides(existingEnv, isUpdating);
  }

  printHeader("DATABASE CONFIGURATION");
  console.log(
    `${colors.dim}  Tip: Get a free PostgreSQL database at ${colors.cyan}https://neon.tech${colors.reset}`,
  );
  console.log("");

  const existingDbUrl = existingEnv.get("DATABASE_URL");
  if (existingDbUrl && isUpdating)
    printUpdateWarning("DATABASE_URL", existingDbUrl);

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

  const lockedProvider = readProviderLock()?.provider;
  if (!lockedProvider) {
    console.log(
      `${colors.red}  No auth provider initialized (.auth-provider.lock missing)${colors.reset}`,
    );
    process.exit(1);
  }

  console.log(
    `${colors.green}  ✓ Using: ${colors.bold}${AUTH_PROVIDER_NAMES[lockedProvider] || lockedProvider}${colors.reset}`,
  );
  console.log(`${colors.dim}  (Locked by .auth-provider.lock)${colors.reset}`);
  console.log("");

  const existingAppUrl = existingEnv.get("NEXT_PUBLIC_APP_URL");
  if (existingAppUrl && isUpdating)
    printUpdateWarning("NEXT_PUBLIC_APP_URL", existingAppUrl);

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
    authProvider: lockedProvider,
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
        newVariables.push({ key, value, section: "Other" });
      }
    });
  }

  printSummary(newVariables, changes);

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

  writeFileSync(envPath, generateEnvContent(newVariables), "utf-8");
  const portSynced = syncDevPort(appUrl);
  const devRestored = restoreRootDevScript();

  console.log("");
  console.log(
    `${colors.green}${colors.bold}  ✅ Successfully wrote .env.local${colors.reset}`,
  );
  if (portSynced) {
    console.log(
      `${colors.green}${colors.bold}  ✅ Updated apps/next-app/package.json dev port to match APP_URL${colors.reset}`,
    );
  }
  if (devRestored) {
    console.log(
      `${colors.green}${colors.bold}  ✅ Restored root dev script${colors.reset}`,
    );
    console.log("");
    const shouldCommit = await confirm({
      message: "Commit all changes and tag as v0-setup-done?",
      default: true,
    });
    if (shouldCommit) {
      commitAndTag();
      console.log("");
      console.log(
        `${colors.green}${colors.bold}  ✅ Committed and tagged as v0-setup-done${colors.reset}`,
      );
    }
  }

  printNextSteps();
}

main().catch((error) => {
  if (error?.name === "ExitPromptError") {
    console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
    process.exit(0);
  }
  console.error("Setup failed:", error);
  process.exit(1);
});
