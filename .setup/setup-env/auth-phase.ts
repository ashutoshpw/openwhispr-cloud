import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { colors } from "../../scripts/lib/colors";
import { confirm, isAutoMode, select } from "../../scripts/lib/prompts";
import {
  backupExistingFiles,
  copyTemplateFiles,
  removeUnusedProviderFolders,
  runBunInstall,
  updatePackageJson,
  writeLockFile,
} from "../auth-init/operations";
import {
  AUTH_PROVIDERS,
  type AuthInitPaths,
  type LockFile as AuthLockFile,
  type AuthProvider,
} from "../auth-init/types";

const ROOT_DIR = resolve(process.cwd());

export const AUTH_PATHS: AuthInitPaths = {
  rootDir: ROOT_DIR,
  lockFilePath: join(ROOT_DIR, ".auth-provider.lock"),
  backupDir: join(ROOT_DIR, ".auth-backup"),
  templatesDir: join(ROOT_DIR, ".setup", "templates", "auth"),
  providerFoldersToRemove: [
    join(ROOT_DIR, "packages", "auth", "src", "providers"),
    join(ROOT_DIR, "apps", "next-app", "src", "lib", "auth", "providers"),
  ],
};

export function readProviderLock(): AuthLockFile | null {
  if (!existsSync(AUTH_PATHS.lockFilePath)) return null;
  try {
    return JSON.parse(readFileSync(AUTH_PATHS.lockFilePath, "utf-8"));
  } catch (error) {
    console.error("Error reading .auth-provider.lock:", error);
    return null;
  }
}

export async function chooseProvider(
  flagProvider: AuthProvider | undefined,
): Promise<AuthProvider> {
  if (flagProvider) return flagProvider;

  if (isAutoMode()) {
    console.log(
      `${colors.dim}  No --provider given; defaulting to better-auth${colors.reset}`,
    );
    return "better-auth";
  }

  return select<AuthProvider>({
    message: "Select your auth provider:",
    choices: AUTH_PROVIDERS.map((provider) => ({
      value: provider.value,
      name: provider.name,
      description: provider.description,
    })),
    default: "better-auth",
  });
}

export async function runAuthInit(
  selectedProvider: AuthProvider,
  existingLock: AuthLockFile | null,
): Promise<void> {
  if (existingLock) {
    console.log("");
    console.log(
      `${colors.yellow}  ⚠ Re-initializing auth (previous: ${existingLock.provider})${colors.reset}`,
    );
  }

  const providerInfo = AUTH_PROVIDERS.find(
    (entry) => entry.value === selectedProvider,
  );

  console.log("");
  console.log(
    `  Selected: ${colors.bold}${colors.green}${selectedProvider}${colors.reset}`,
  );
  console.log(`  ${colors.dim}${providerInfo?.description}${colors.reset}`);
  console.log("");

  if (!isAutoMode()) {
    console.log(
      `${colors.red}${colors.bold}  ⚠ WARNING: This choice is IRREVERSIBLE!${colors.reset}`,
    );
    console.log(
      `${colors.dim}  Once initialized, you cannot switch to a different auth provider.${colors.reset}`,
    );
    console.log("");

    const confirmChoice = await confirm({
      message: `Initialize with ${selectedProvider}? This cannot be undone.`,
      default: false,
    });
    if (!confirmChoice) {
      console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
      process.exit(0);
    }
  }

  console.log(`${colors.cyan}━${"━".repeat(59)}${colors.reset}`);
  console.log(
    `${colors.cyan}  Initializing ${selectedProvider}...${colors.reset}`,
  );
  console.log(`${colors.cyan}━${"━".repeat(59)}${colors.reset}`);
  console.log("");

  const logStep = (step: number, total: number, message: string) =>
    console.log(`${colors.cyan}  [${step}/${total}] ${message}${colors.reset}`);
  const logSuccess = (message: string) =>
    console.log(`${colors.green}  ✓ ${message}${colors.reset}`);
  const logWarning = (message: string) =>
    console.log(`${colors.yellow}  ⚠ ${message}${colors.reset}`);

  const total = 6;
  let step = 0;

  step++;
  logStep(step, total, "Backing up existing files...");
  backupExistingFiles(AUTH_PATHS, logSuccess);

  step++;
  logStep(step, total, "Copying template files...");
  const copiedFiles = copyTemplateFiles(AUTH_PATHS, selectedProvider);
  logSuccess(`Copied ${copiedFiles.length} files`);

  step++;
  logStep(step, total, "Updating dependencies...");
  const depsChanges = updatePackageJson(
    AUTH_PATHS,
    selectedProvider,
    logWarning,
  );
  if (depsChanges.added.length > 0) {
    logSuccess(`Added ${depsChanges.added.length} dependencies`);
  }
  if (depsChanges.removed.length > 0) {
    logSuccess(`Removed ${depsChanges.removed.length} dependencies`);
  }

  step++;
  logStep(step, total, "Cleaning up unused providers...");
  const removedFolders = removeUnusedProviderFolders(AUTH_PATHS);
  if (removedFolders.length > 0) {
    logSuccess(`Removed ${removedFolders.length} provider folders`);
  }

  step++;
  logStep(step, total, "Writing lock file...");
  writeLockFile(
    AUTH_PATHS,
    selectedProvider,
    copiedFiles,
    removedFolders,
    depsChanges,
  );
  logSuccess("Created .auth-provider.lock");

  step++;
  logStep(step, total, "Installing dependencies...");
  console.log(`${colors.dim}  Running bun install...${colors.reset}`);
  runBunInstall(AUTH_PATHS.rootDir);

  console.log("");
  console.log(`${colors.green}━${"━".repeat(59)}${colors.reset}`);
  console.log(
    `${colors.green}${colors.bold}  ✓ Auth provider initialized${colors.reset}`,
  );
  console.log(`${colors.green}━${"━".repeat(59)}${colors.reset}`);
  console.log("");
}

export async function runAuthPhaseIfNeeded(
  flagProvider: AuthProvider | undefined,
  force: boolean,
): Promise<void> {
  const existingLock = readProviderLock();

  if (existingLock && !force) {
    console.log(
      `${colors.green}  ✓ Auth already initialized: ${colors.bold}${existingLock.provider}${colors.reset}`,
    );
    console.log(
      `${colors.dim}  Use --force to re-initialize (overwrites current auth setup).${colors.reset}`,
    );
    return;
  }

  if (existingLock && force) {
    console.log("");
    console.log(
      `${colors.yellow}  ⚠ --force: re-initializing auth (current: ${existingLock.provider})${colors.reset}`,
    );
    if (!isAutoMode()) {
      const confirmForce = await confirm({
        message: `Are you ABSOLUTELY SURE? This overwrites the ${existingLock.provider} setup.`,
        default: false,
      });
      if (!confirmForce) {
        console.log(`\n${colors.dim}Cancelled.${colors.reset}`);
        process.exit(0);
      }
    }
  }

  const selectedProvider = await chooseProvider(flagProvider);
  try {
    await runAuthInit(selectedProvider, existingLock);
  } catch (error) {
    console.error(
      `${colors.red}  Auth init failed: ${error instanceof Error ? error.message : String(error)}${colors.reset}`,
    );
    console.log(
      `${colors.yellow}  Original files backed up to .auth-backup/${colors.reset}`,
    );
    process.exit(1);
  }
}
