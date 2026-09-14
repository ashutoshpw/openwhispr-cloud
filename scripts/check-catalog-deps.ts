#!/usr/bin/env bun

/**
 * Pre-commit hook: require catalog references for catalog-managed dependencies.
 *
 * The staged snapshot is inspected so the check validates exactly what will be
 * committed. Peer dependency ranges are intentionally excluded because shared
 * packages may support multiple host versions.
 */

import { execFileSync } from "node:child_process";

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

interface PackageManifest {
  catalog?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface Violation {
  file: string;
  section: DependencySection;
  dependency: string;
  value: string;
  reason: string;
}

function getStagedFiles(): string[] {
  const output = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { encoding: "utf8" },
  ).trim();

  return output
    ? output
        .split("\n")
        .map((file) => file.trim())
        .filter(Boolean)
    : [];
}

function isWorkspaceManifest(file: string): boolean {
  return (
    file === "package.json" ||
    /^(apps|packages)\/[^/]+\/package\.json$/.test(file)
  );
}

function readStagedFile(file: string): string {
  return execFileSync("git", ["show", `:${file}`], { encoding: "utf8" });
}

function readManifest(file: string): PackageManifest | null {
  try {
    return JSON.parse(readStagedFile(file)) as PackageManifest;
  } catch {
    console.error(`\n✗ Could not parse staged JSON: ${file}`);
    process.exitCode = 1;
    return null;
  }
}

const stagedFiles = getStagedFiles();
const stagedManifests = stagedFiles.filter(isWorkspaceManifest);

if (stagedManifests.length === 0) process.exit(0);

const rootManifest = readManifest("package.json");
if (!rootManifest) process.exit(1);

const catalog = rootManifest.catalog ?? {};
const violations: Violation[] = [];

for (const file of stagedManifests) {
  const manifest = readManifest(file);
  if (!manifest) continue;

  for (const section of DEPENDENCY_SECTIONS) {
    for (const [dependency, value] of Object.entries(manifest[section] ?? {})) {
      const isCatalogReference = value === "catalog:";
      const isAnyCatalogReference = value.startsWith("catalog:");
      const isCatalogManaged = Object.prototype.hasOwnProperty.call(
        catalog,
        dependency,
      );

      if (isCatalogManaged && !isCatalogReference) {
        violations.push({
          file,
          section,
          dependency,
          value,
          reason: 'catalog-managed dependencies must use "catalog:"',
        });
      } else if (isAnyCatalogReference && !isCatalogManaged) {
        violations.push({
          file,
          section,
          dependency,
          value,
          reason: "the dependency is not defined in the root catalog",
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    "\n✗ Commit blocked: catalog-managed dependencies must use the root catalog.\n",
  );

  for (const violation of violations) {
    console.error(`  ✗ ${violation.file}`);
    console.error(`    Section:    ${violation.section}`);
    console.error(`    Dependency: ${violation.dependency}`);
    console.error(`    Value:      ${violation.value}`);
    console.error(`    Fix:        ${violation.reason}\n`);
  }

  process.exit(1);
}

console.log(
  `Catalog dependency check passed (${stagedManifests.length} staged manifest${stagedManifests.length === 1 ? "" : "s"}).`,
);
