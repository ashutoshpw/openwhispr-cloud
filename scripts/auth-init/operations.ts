import { execSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { copyDirectoryRecursive, ensureDirectoryExists } from "../lib/fs";
import type {
  AuthInitPaths,
  AuthProvider,
  DependenciesConfig,
  LockFile,
} from "./types";

export function backupExistingFiles(
  paths: AuthInitPaths,
  onSuccess: (message: string) => void,
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(paths.backupDir, timestamp);

  mkdirSync(backupPath, { recursive: true });

  const packagesAuthPath = join(paths.rootDir, "packages", "auth");
  if (existsSync(packagesAuthPath)) {
    cpSync(packagesAuthPath, join(backupPath, "packages-auth"), {
      recursive: true,
    });
  }

  const appLibAuthPath = join(
    paths.rootDir,
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

  const middlewarePath = join(
    paths.rootDir,
    "apps",
    "next-app",
    "src",
    "middleware.ts",
  );
  if (existsSync(middlewarePath)) {
    copyFileSync(middlewarePath, join(backupPath, "middleware.ts"));
  }

  const wrapperPath = join(
    paths.rootDir,
    "apps",
    "next-app",
    "src",
    "components",
    "AuthProviderWrapper.tsx",
  );
  if (existsSync(wrapperPath)) {
    copyFileSync(wrapperPath, join(backupPath, "AuthProviderWrapper.tsx"));
  }

  onSuccess(`Backed up existing files to ${backupPath}`);
}

export function copyTemplateFiles(
  paths: AuthInitPaths,
  provider: AuthProvider,
): string[] {
  const templateDir = join(paths.templatesDir, provider);
  const copied: string[] = [];

  if (!existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  const packagesAuthSrcPath = join(paths.rootDir, "packages", "auth", "src");
  if (existsSync(packagesAuthSrcPath)) {
    rmSync(packagesAuthSrcPath, { recursive: true, force: true });
  }

  const packagesAuthTemplatePath = join(templateDir, "packages-auth");
  if (existsSync(packagesAuthTemplatePath)) {
    copied.push(
      ...copyDirectoryRecursive(
        packagesAuthTemplatePath,
        join(paths.rootDir, "packages", "auth"),
      ),
    );
  }

  const appLibAuthPath = join(
    paths.rootDir,
    "apps",
    "next-app",
    "src",
    "lib",
    "auth",
  );
  if (existsSync(appLibAuthPath)) {
    rmSync(appLibAuthPath, { recursive: true, force: true });
  }

  const appLibAuthTemplatePath = join(templateDir, "app-lib-auth");
  if (existsSync(appLibAuthTemplatePath)) {
    copied.push(
      ...copyDirectoryRecursive(appLibAuthTemplatePath, appLibAuthPath),
    );
  }

  const middlewareTemplatePath = join(templateDir, "middleware.ts");
  const middlewareDestPath = join(
    paths.rootDir,
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

  const wrapperTemplatePath = join(
    templateDir,
    "components",
    "AuthProviderWrapper.tsx",
  );
  const wrapperDestPath = join(
    paths.rootDir,
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

export function updatePackageJson(
  paths: AuthInitPaths,
  provider: AuthProvider,
  onWarning: (message: string) => void,
): { added: string[]; removed: string[] } {
  const depsConfigPath = join(
    paths.templatesDir,
    provider,
    "dependencies.json",
  );

  if (!existsSync(depsConfigPath)) {
    onWarning("No dependencies.json found, skipping package.json updates");
    return { added: [], removed: [] };
  }

  const depsConfig: DependenciesConfig = JSON.parse(
    readFileSync(depsConfigPath, "utf-8"),
  );

  const added: string[] = [];
  const removed: string[] = [];

  for (const [workspace, config] of Object.entries(depsConfig)) {
    const packageJsonPath = join(paths.rootDir, workspace, "package.json");

    if (!existsSync(packageJsonPath)) {
      onWarning(`package.json not found for workspace: ${workspace}`);
      continue;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    if (config.add) {
      packageJson.dependencies = packageJson.dependencies || {};
      for (const [pkg, version] of Object.entries(config.add)) {
        packageJson.dependencies[pkg] = version;
        added.push(`${workspace}:${pkg}`);
      }
    }

    if (config.remove) {
      for (const pkg of config.remove) {
        if (packageJson.dependencies?.[pkg]) {
          delete packageJson.dependencies[pkg];
          removed.push(`${workspace}:${pkg}`);
        }
      }
    }

    if (config.devDependencies?.add) {
      packageJson.devDependencies = packageJson.devDependencies || {};
      for (const [pkg, version] of Object.entries(config.devDependencies.add)) {
        packageJson.devDependencies[pkg] = version;
        added.push(`${workspace}:${pkg} (dev)`);
      }
    }

    if (config.devDependencies?.remove) {
      for (const pkg of config.devDependencies.remove) {
        if (packageJson.devDependencies?.[pkg]) {
          delete packageJson.devDependencies[pkg];
          removed.push(`${workspace}:${pkg} (dev)`);
        }
      }
    }

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

    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  return { added, removed };
}

export function removeUnusedProviderFolders(paths: AuthInitPaths): string[] {
  const removed: string[] = [];

  for (const folderPath of paths.providerFoldersToRemove) {
    if (existsSync(folderPath)) {
      rmSync(folderPath, { recursive: true, force: true });
      removed.push(folderPath);
    }
  }

  return removed;
}

export function writeLockFile(
  paths: AuthInitPaths,
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
      copied: copiedFiles.map((file) => file.replace(paths.rootDir, "")),
      removed: removedFolders.map((file) => file.replace(paths.rootDir, "")),
    },
    dependencies: depsChanges,
  };

  writeFileSync(paths.lockFilePath, `${JSON.stringify(lockFile, null, 2)}\n`);
}

export function runBunInstall(rootDir: string): void {
  try {
    execSync("bun install", {
      cwd: rootDir,
      stdio: "inherit",
    });
  } catch {
    throw new Error("bun install failed");
  }
}
