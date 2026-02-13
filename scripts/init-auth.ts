#!/usr/bin/env tsx
/**
 * Auth Provider Initialization Script
 *
 * This script initializes the project with a single auth provider.
 * The choice is IRREVERSIBLE - once selected, the provider is locked in.
 *
 * Usage:
 *   bun run init-auth                    # Interactive selection
 *   bun run init-auth --provider=clerk   # Direct selection
 *   bun run init-auth --provider=clerk --yes  # Skip confirmation
 *   bun run init-auth --force            # Re-initialize (dangerous!)
 *
 * Flags:
 *   --provider=<name>  Select provider directly (better-auth, next-auth, clerk, authkit)
 *   --yes, -y          Skip confirmation prompts (for CI/scripting)
 *   --force, -f        Re-initialize even if already locked (dangerous!)
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  backupExistingFiles,
  copyTemplateFiles,
  removeUnusedProviderFolders,
  runBunInstall,
  updatePackageJson,
  writeLockFile,
} from "./auth-init/operations";
import {
  AUTH_PROVIDERS,
  type AuthInitPaths,
  type AuthProvider,
  type LockFile,
} from "./auth-init/types";
import { colors } from "./lib/colors";
import { confirm, select } from "./lib/prompts";

const ROOT_DIR = resolve(process.cwd());

const PATHS: AuthInitPaths = {
  rootDir: ROOT_DIR,
  lockFilePath: join(ROOT_DIR, ".auth-provider.lock"),
  backupDir: join(ROOT_DIR, ".auth-backup"),
  templatesDir: join(ROOT_DIR, "templates", "auth"),
  providerFoldersToRemove: [
    join(ROOT_DIR, "packages", "auth", "src", "providers"),
    join(ROOT_DIR, "apps", "next-app", "src", "lib", "auth", "providers"),
  ],
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step: number, total: number, message: string) {
  log(`  [${step}/${total}] ${message}`, colors.cyan);
}

function logSuccess(message: string) {
  log(`  ✓ ${message}`, colors.green);
}

function logWarning(message: string) {
  log(`  ⚠ ${message}`, colors.yellow);
}

function logError(message: string) {
  log(`  ✗ ${message}`, colors.red);
}

function printBanner() {
  console.log("");
  log(`┌${"─".repeat(60)}┐`, colors.magenta);
  log(
    `│  ${colors.bold}Auth Provider Initialization${colors.reset}${colors.magenta}                              │`,
    colors.magenta,
  );
  log(
    "│                                                            │",
    colors.magenta,
  );
  log(
    `│  ${colors.dim}Select ONE auth provider for your project.${colors.reset}${colors.magenta}                 │`,
    colors.magenta,
  );
  log(
    `│  ${colors.red}${colors.bold}This choice is IRREVERSIBLE!${colors.reset}${colors.magenta}                              │`,
    colors.magenta,
  );
  log(`└${"─".repeat(60)}┘`, colors.magenta);
  console.log("");
}

function parseArgs(): {
  provider?: AuthProvider;
  force: boolean;
  yes: boolean;
} {
  const args = process.argv.slice(2);
  let provider: AuthProvider | undefined;
  let force = false;
  let yes = false;

  for (const arg of args) {
    if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--yes" || arg === "-y") {
      yes = true;
    } else if (arg.startsWith("--provider=")) {
      const value = arg.split("=")[1] as AuthProvider;
      if (AUTH_PROVIDERS.some((entry) => entry.value === value)) {
        provider = value;
      } else {
        logError(`Unknown provider: ${value}`);
        logError(
          `Available providers: ${AUTH_PROVIDERS.map((entry) => entry.value).join(", ")}`,
        );
        process.exit(1);
      }
    }
  }

  return { provider, force, yes };
}

function checkLockFile(force: boolean): LockFile | null {
  if (!existsSync(PATHS.lockFilePath)) {
    return null;
  }

  const lockContent = readFileSync(PATHS.lockFilePath, "utf-8");
  const lockFile: LockFile = JSON.parse(lockContent);

  if (!force) {
    log("");
    logError("Auth provider already initialized!");
    log("");
    log(`  Provider: ${colors.bold}${lockFile.provider}${colors.reset}`);
    log(`  Initialized: ${lockFile.initializedAt}`);
    log("");
    log(
      `  ${colors.yellow}The auth provider choice is permanent and cannot be changed.${colors.reset}`,
    );
    log(
      `  ${colors.dim}To re-initialize (DANGEROUS), use: bun run init-auth --force${colors.reset}`,
    );
    log("");
    process.exit(1);
  }

  return lockFile;
}

async function selectProvider(
  argProvider?: AuthProvider,
): Promise<AuthProvider> {
  if (argProvider) {
    log(
      `  Using provider from argument: ${colors.bold}${argProvider}${colors.reset}`,
    );
    return argProvider;
  }

  return select({
    message: "Select your auth provider:",
    choices: AUTH_PROVIDERS.map((provider) => ({
      value: provider.value,
      name: provider.name,
      description: provider.description,
    })),
    default: "better-auth",
  });
}

async function main() {
  printBanner();

  const { provider: argProvider, force, yes } = parseArgs();
  const existingLock = checkLockFile(force);

  if (existingLock && force) {
    logWarning("Force mode enabled - re-initializing auth provider");
    logWarning(`Previous provider: ${existingLock.provider}`);
    log("");

    if (!yes) {
      const confirmForce = await confirm({
        message: `Are you ABSOLUTELY SURE you want to re-initialize? This will overwrite your current auth setup (${existingLock.provider}).`,
        default: false,
      });

      if (!confirmForce) {
        log("");
        log("  Cancelled.", colors.dim);
        process.exit(0);
      }
    } else {
      log("  Skipping confirmation (--yes flag)", colors.dim);
    }
  }

  const selectedProvider = await selectProvider(argProvider);

  const providerInfo = AUTH_PROVIDERS.find(
    (provider) => provider.value === selectedProvider,
  );
  log("");
  log(
    `  Selected: ${colors.bold}${colors.green}${selectedProvider}${colors.reset}`,
  );
  log(`  ${colors.dim}${providerInfo?.description}${colors.reset}`);
  log("");

  if (!yes) {
    log(
      `${colors.red}${colors.bold}  ⚠ WARNING: This choice is IRREVERSIBLE!${colors.reset}`,
    );
    log(
      `${colors.dim}  Once initialized, you cannot switch to a different auth provider.${colors.reset}`,
    );
    log("");

    const confirmChoice = await confirm({
      message: `Initialize with ${selectedProvider}? This cannot be undone.`,
      default: false,
    });

    if (!confirmChoice) {
      log("");
      log("  Cancelled.", colors.dim);
      process.exit(0);
    }
  } else {
    log(`${colors.yellow}  Skipping confirmation (--yes flag)${colors.reset}`);
  }

  log("");
  log(`${colors.cyan}━${"━".repeat(59)}${colors.reset}`);
  log(`${colors.cyan}  Initializing ${selectedProvider}...${colors.reset}`);
  log(`${colors.cyan}━${"━".repeat(59)}${colors.reset}`);
  log("");

  const totalSteps = 6;
  let currentStep = 0;

  try {
    currentStep++;
    logStep(currentStep, totalSteps, "Backing up existing files...");
    backupExistingFiles(PATHS, logSuccess);

    currentStep++;
    logStep(currentStep, totalSteps, "Copying template files...");
    const copiedFiles = copyTemplateFiles(PATHS, selectedProvider);
    logSuccess(`Copied ${copiedFiles.length} files`);

    currentStep++;
    logStep(currentStep, totalSteps, "Updating dependencies...");
    const depsChanges = updatePackageJson(PATHS, selectedProvider, logWarning);
    if (depsChanges.added.length > 0) {
      logSuccess(`Added ${depsChanges.added.length} dependencies`);
    }
    if (depsChanges.removed.length > 0) {
      logSuccess(`Removed ${depsChanges.removed.length} dependencies`);
    }

    currentStep++;
    logStep(currentStep, totalSteps, "Cleaning up unused providers...");
    const removedFolders = removeUnusedProviderFolders(PATHS);
    if (removedFolders.length > 0) {
      logSuccess(`Removed ${removedFolders.length} provider folders`);
    }

    currentStep++;
    logStep(currentStep, totalSteps, "Writing lock file...");
    writeLockFile(
      PATHS,
      selectedProvider,
      copiedFiles,
      removedFolders,
      depsChanges,
    );
    logSuccess("Created .auth-provider.lock");

    currentStep++;
    logStep(currentStep, totalSteps, "Installing dependencies...");
    log("");
    log("  Running bun install...", colors.dim);
    runBunInstall(PATHS.rootDir);

    log("");
    log(`${colors.green}━${"━".repeat(59)}${colors.reset}`);
    log(
      `${colors.green}${colors.bold}  ✓ Auth provider initialized successfully!${colors.reset}`,
    );
    log(`${colors.green}━${"━".repeat(59)}${colors.reset}`);
    log("");
    log(`  Provider: ${colors.bold}${selectedProvider}${colors.reset}`);
    log(`  Lock file: ${colors.dim}.auth-provider.lock${colors.reset}`);
    log(`  Backup: ${colors.dim}.auth-backup/${colors.reset}`);
    log("");
    log(`  ${colors.cyan}Next steps:${colors.reset}`);
    log(
      `  1. Run ${colors.bold}bun run setup${colors.reset} to configure environment variables`,
    );
    log(
      `  2. Run ${colors.bold}bun run db:push${colors.reset} to update database schema`,
    );
    log(
      `  3. Run ${colors.bold}bun run dev${colors.reset} to start development`,
    );
    log("");
  } catch (error) {
    logError("Initialization failed!");
    logError(error instanceof Error ? error.message : String(error));
    log("");
    log(
      `  ${colors.yellow}Your original files have been backed up to .auth-backup/${colors.reset}`,
    );
    log(
      `  ${colors.yellow}You may need to restore them manually if rollback is needed.${colors.reset}`,
    );
    log("");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
