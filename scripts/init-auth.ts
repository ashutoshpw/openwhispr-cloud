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
 *
 * What it does:
 * 1. Checks for existing .auth-provider.lock (aborts if exists)
 * 2. Prompts for provider selection (better-auth is default)
 * 3. Confirms the choice (irreversible warning)
 * 4. Backs up existing auth files to .auth-backup/
 * 5. Copies template files to their destinations
 * 6. Updates package.json dependencies
 * 7. Removes unused provider folders
 * 8. Writes .auth-provider.lock with metadata
 * 9. Runs bun install
 * 10. Rolls back on error
 */

import { confirm, select } from "@inquirer/prompts";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execSync } from "node:child_process";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Available auth providers
const AUTH_PROVIDERS = [
  {
    value: "better-auth",
    name: "Better Auth (Recommended - simple, self-hosted, full-featured)",
    description: "Self-hosted auth with email/password, OAuth, organizations",
  },
  {
    value: "next-auth",
    name: "NextAuth (Auth.js v5 - widely used, flexible)",
    description: "Popular auth library with many OAuth providers",
  },
  {
    value: "clerk",
    name: "Clerk (Managed auth - hosted UI, user management)",
    description: "Fully managed auth with pre-built components",
  },
  {
    value: "authkit",
    name: "AuthKit (WorkOS - enterprise SSO, directory sync)",
    description: "Enterprise-grade auth with SSO and SCIM",
  },
] as const;

type AuthProvider = (typeof AUTH_PROVIDERS)[number]["value"];

interface LockFile {
  version: string;
  provider: AuthProvider;
  initializedAt: string;
  templateVersion: string;
  files: {
    copied: string[];
    removed: string[];
  };
  dependencies: {
    added: string[];
    removed: string[];
  };
}

interface DependenciesConfig {
  [workspace: string]: {
    add?: Record<string, string>;
    remove?: string[];
    devDependencies?: {
      add?: Record<string, string>;
      remove?: string[];
    };
  };
}

// Paths
const ROOT_DIR = resolve(process.cwd());
const LOCK_FILE_PATH = join(ROOT_DIR, ".auth-provider.lock");
const BACKUP_DIR = join(ROOT_DIR, ".auth-backup");
const TEMPLATES_DIR = join(ROOT_DIR, "templates", "auth");

// Template file mappings
const FILE_MAPPINGS = {
  "packages-auth": join(ROOT_DIR, "packages", "auth"),
  "app-lib-auth": join(ROOT_DIR, "apps", "next-app", "src", "lib", "auth"),
  components: {
    "AuthProviderWrapper.tsx": join(
      ROOT_DIR,
      "apps",
      "next-app",
      "src",
      "components",
      "AuthProviderWrapper.tsx",
    ),
  },
  "middleware.ts": join(ROOT_DIR, "apps", "next-app", "src", "middleware.ts"),
};

// Folders to clean up after initialization
const PROVIDER_FOLDERS_TO_REMOVE = [
  join(ROOT_DIR, "packages", "auth", "src", "providers"),
  join(ROOT_DIR, "apps", "next-app", "src", "lib", "auth", "providers"),
];

// Helper functions
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
    `│                                                            │`,
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
      if (AUTH_PROVIDERS.some((p) => p.value === value)) {
        provider = value;
      } else {
        logError(`Unknown provider: ${value}`);
        logError(
          `Available providers: ${AUTH_PROVIDERS.map((p) => p.value).join(", ")}`,
        );
        process.exit(1);
      }
    }
  }

  return { provider, force, yes };
}

function checkLockFile(force: boolean): LockFile | null {
  if (!existsSync(LOCK_FILE_PATH)) {
    return null;
  }

  const lockContent = readFileSync(LOCK_FILE_PATH, "utf-8");
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

function ensureDirectoryExists(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyDirectory(src: string, dest: string): string[] {
  const copied: string[] = [];

  if (!existsSync(src)) {
    return copied;
  }

  ensureDirectoryExists(dest);

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copied.push(...copyDirectory(srcPath, destPath));
    } else {
      ensureDirectoryExists(destPath);
      copyFileSync(srcPath, destPath);
      copied.push(destPath);
    }
  }

  return copied;
}

function backupExistingFiles(): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, timestamp);

  mkdirSync(backupPath, { recursive: true });

  // Backup packages/auth
  const packagesAuthPath = join(ROOT_DIR, "packages", "auth");
  if (existsSync(packagesAuthPath)) {
    cpSync(packagesAuthPath, join(backupPath, "packages-auth"), {
      recursive: true,
    });
  }

  // Backup apps/next-app/src/lib/auth
  const appLibAuthPath = join(
    ROOT_DIR,
    "apps",
    "next-app",
    "src",
    "lib",
    "auth",
  );
  if (existsSync(appLibAuthPath)) {
    cpSync(appLibAuthPath, join(backupPath, "app-lib-auth"), {
      recursive: true,
    });
  }

  // Backup middleware.ts
  const middlewarePath = join(
    ROOT_DIR,
    "apps",
    "next-app",
    "src",
    "middleware.ts",
  );
  if (existsSync(middlewarePath)) {
    copyFileSync(middlewarePath, join(backupPath, "middleware.ts"));
  }

  // Backup AuthProviderWrapper.tsx
  const wrapperPath = join(
    ROOT_DIR,
    "apps",
    "next-app",
    "src",
    "components",
    "AuthProviderWrapper.tsx",
  );
  if (existsSync(wrapperPath)) {
    copyFileSync(wrapperPath, join(backupPath, "AuthProviderWrapper.tsx"));
  }

  logSuccess(`Backed up existing files to ${backupPath}`);
}

function copyTemplateFiles(provider: AuthProvider): string[] {
  const templateDir = join(TEMPLATES_DIR, provider);
  const copied: string[] = [];

  if (!existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  // Clear existing packages/auth/src (but keep package.json if not in template)
  const packagesAuthSrcPath = join(ROOT_DIR, "packages", "auth", "src");
  if (existsSync(packagesAuthSrcPath)) {
    rmSync(packagesAuthSrcPath, { recursive: true, force: true });
  }

  // Copy packages-auth
  const packagesAuthTemplatePath = join(templateDir, "packages-auth");
  if (existsSync(packagesAuthTemplatePath)) {
    copied.push(
      ...copyDirectory(
        packagesAuthTemplatePath,
        join(ROOT_DIR, "packages", "auth"),
      ),
    );
  }

  // Clear existing apps/next-app/src/lib/auth
  const appLibAuthPath = join(
    ROOT_DIR,
    "apps",
    "next-app",
    "src",
    "lib",
    "auth",
  );
  if (existsSync(appLibAuthPath)) {
    rmSync(appLibAuthPath, { recursive: true, force: true });
  }

  // Copy app-lib-auth
  const appLibAuthTemplatePath = join(templateDir, "app-lib-auth");
  if (existsSync(appLibAuthTemplatePath)) {
    copied.push(...copyDirectory(appLibAuthTemplatePath, appLibAuthPath));
  }

  // Copy middleware.ts
  const middlewareTemplatePath = join(templateDir, "middleware.ts");
  const middlewareDestPath = join(
    ROOT_DIR,
    "apps",
    "next-app",
    "src",
    "middleware.ts",
  );
  if (existsSync(middlewareTemplatePath)) {
    ensureDirectoryExists(middlewareDestPath);
    copyFileSync(middlewareTemplatePath, middlewareDestPath);
    copied.push(middlewareDestPath);
  }

  // Copy AuthProviderWrapper.tsx
  const wrapperTemplatePath = join(
    templateDir,
    "components",
    "AuthProviderWrapper.tsx",
  );
  const wrapperDestPath = join(
    ROOT_DIR,
    "apps",
    "next-app",
    "src",
    "components",
    "AuthProviderWrapper.tsx",
  );
  if (existsSync(wrapperTemplatePath)) {
    ensureDirectoryExists(wrapperDestPath);
    copyFileSync(wrapperTemplatePath, wrapperDestPath);
    copied.push(wrapperDestPath);
  }

  return copied;
}

function updatePackageJson(provider: AuthProvider): {
  added: string[];
  removed: string[];
} {
  const depsConfigPath = join(TEMPLATES_DIR, provider, "dependencies.json");

  if (!existsSync(depsConfigPath)) {
    logWarning("No dependencies.json found, skipping package.json updates");
    return { added: [], removed: [] };
  }

  const depsConfig: DependenciesConfig = JSON.parse(
    readFileSync(depsConfigPath, "utf-8"),
  );

  const added: string[] = [];
  const removed: string[] = [];

  for (const [workspace, config] of Object.entries(depsConfig)) {
    const packageJsonPath = join(ROOT_DIR, workspace, "package.json");

    if (!existsSync(packageJsonPath)) {
      logWarning(`package.json not found for workspace: ${workspace}`);
      continue;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    // Add dependencies
    if (config.add) {
      packageJson.dependencies = packageJson.dependencies || {};
      for (const [pkg, version] of Object.entries(config.add)) {
        packageJson.dependencies[pkg] = version;
        added.push(`${workspace}:${pkg}`);
      }
    }

    // Remove dependencies
    if (config.remove) {
      for (const pkg of config.remove) {
        if (packageJson.dependencies?.[pkg]) {
          delete packageJson.dependencies[pkg];
          removed.push(`${workspace}:${pkg}`);
        }
      }
    }

    // Add dev dependencies
    if (config.devDependencies?.add) {
      packageJson.devDependencies = packageJson.devDependencies || {};
      for (const [pkg, version] of Object.entries(config.devDependencies.add)) {
        packageJson.devDependencies[pkg] = version;
        added.push(`${workspace}:${pkg} (dev)`);
      }
    }

    // Remove dev dependencies
    if (config.devDependencies?.remove) {
      for (const pkg of config.devDependencies.remove) {
        if (packageJson.devDependencies?.[pkg]) {
          delete packageJson.devDependencies[pkg];
          removed.push(`${workspace}:${pkg} (dev)`);
        }
      }
    }

    // Sort dependencies alphabetically
    if (packageJson.dependencies) {
      packageJson.dependencies = Object.fromEntries(
        Object.entries(packageJson.dependencies).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      );
    }
    if (packageJson.devDependencies) {
      packageJson.devDependencies = Object.fromEntries(
        Object.entries(packageJson.devDependencies).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      );
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  }

  return { added, removed };
}

function removeUnusedProviderFolders(): string[] {
  const removed: string[] = [];

  for (const folderPath of PROVIDER_FOLDERS_TO_REMOVE) {
    if (existsSync(folderPath)) {
      rmSync(folderPath, { recursive: true, force: true });
      removed.push(folderPath);
    }
  }

  return removed;
}

function writeLockFile(
  provider: AuthProvider,
  copiedFiles: string[],
  removedFolders: string[],
  depsChanges: { added: string[]; removed: string[] },
): void {
  const lockFile: LockFile = {
    version: "1.0.0",
    provider,
    initializedAt: new Date().toISOString(),
    templateVersion: "1.0.0",
    files: {
      copied: copiedFiles.map((f) => f.replace(ROOT_DIR, "")),
      removed: removedFolders.map((f) => f.replace(ROOT_DIR, "")),
    },
    dependencies: depsChanges,
  };

  writeFileSync(LOCK_FILE_PATH, JSON.stringify(lockFile, null, 2) + "\n");
}

function runBunInstall(): void {
  log("");
  log("  Running bun install...", colors.dim);
  try {
    execSync("bun install", {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error("bun install failed");
  }
}

async function main() {
  printBanner();

  const { provider: argProvider, force, yes } = parseArgs();

  // Check for existing lock file
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

  // Select provider
  let selectedProvider: AuthProvider;

  if (argProvider) {
    selectedProvider = argProvider;
    log(
      `  Using provider from argument: ${colors.bold}${selectedProvider}${colors.reset}`,
    );
  } else {
    selectedProvider = await select({
      message: "Select your auth provider:",
      choices: AUTH_PROVIDERS.map((p) => ({
        value: p.value,
        name: p.name,
        description: p.description,
      })),
      default: "better-auth",
    });
  }

  // Show provider info
  const providerInfo = AUTH_PROVIDERS.find((p) => p.value === selectedProvider);
  log("");
  log(
    `  Selected: ${colors.bold}${colors.green}${selectedProvider}${colors.reset}`,
  );
  log(`  ${colors.dim}${providerInfo?.description}${colors.reset}`);
  log("");

  // Final confirmation (skip if --yes flag)
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
    // Step 1: Backup existing files
    currentStep++;
    logStep(currentStep, totalSteps, "Backing up existing files...");
    backupExistingFiles();

    // Step 2: Copy template files
    currentStep++;
    logStep(currentStep, totalSteps, "Copying template files...");
    const copiedFiles = copyTemplateFiles(selectedProvider);
    logSuccess(`Copied ${copiedFiles.length} files`);

    // Step 3: Update package.json dependencies
    currentStep++;
    logStep(currentStep, totalSteps, "Updating dependencies...");
    const depsChanges = updatePackageJson(selectedProvider);
    if (depsChanges.added.length > 0) {
      logSuccess(`Added ${depsChanges.added.length} dependencies`);
    }
    if (depsChanges.removed.length > 0) {
      logSuccess(`Removed ${depsChanges.removed.length} dependencies`);
    }

    // Step 4: Remove unused provider folders
    currentStep++;
    logStep(currentStep, totalSteps, "Cleaning up unused providers...");
    const removedFolders = removeUnusedProviderFolders();
    if (removedFolders.length > 0) {
      logSuccess(`Removed ${removedFolders.length} provider folders`);
    }

    // Step 5: Write lock file
    currentStep++;
    logStep(currentStep, totalSteps, "Writing lock file...");
    writeLockFile(selectedProvider, copiedFiles, removedFolders, depsChanges);
    logSuccess("Created .auth-provider.lock");

    // Step 6: Run bun install
    currentStep++;
    logStep(currentStep, totalSteps, "Installing dependencies...");
    runBunInstall();

    // Success message
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
