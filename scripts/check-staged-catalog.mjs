#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const INSTALLABLE_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
];

function runGit(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function findRoot() {
  return runGit(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
}

function readStaged(root, relativePath) {
  try {
    return runGit(root, ["show", `:${relativePath}`]);
  } catch {
    return null;
  }
}

function readHead(root, relativePath) {
  try {
    return runGit(root, ["show", `HEAD:${relativePath}`]);
  } catch {
    return null;
  }
}

function parseManifest(text, label) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}: invalid JSON (${error.message})`);
  }
}

function stagedPaths(root) {
  const output = runGit(root, [
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACMR",
  ]).trim();
  return output
    ? output
        .split("\n")
        .map((file) => file.trim())
        .filter(Boolean)
    : [];
}

function dependencyEntries(manifest) {
  const entries = [];
  for (const section of INSTALLABLE_SECTIONS) {
    for (const [name, spec] of Object.entries(manifest?.[section] ?? {})) {
      entries.push({ name, section, spec });
    }
  }
  return entries;
}

function catalogLookup(rootManifest) {
  const lookup = new Map();
  for (const [name, version] of Object.entries(rootManifest?.catalog ?? {})) {
    lookup.set(name, { reference: "catalog:", version });
  }
  for (const [catalogName, entries] of Object.entries(
    rootManifest?.catalogs ?? {},
  )) {
    for (const [name, version] of Object.entries(entries ?? {})) {
      if (!lookup.has(name)) {
        lookup.set(name, { reference: `catalog:${catalogName}`, version });
      }
    }
  }
  return lookup;
}

function isCatalogReference(spec) {
  return (
    typeof spec === "string" && /^catalog:(?:[A-Za-z0-9._-]+)?$/.test(spec)
  );
}

function activeManifestPaths(root, rootManifest) {
  const active = new Set(["package.json"]);
  const workspaces = Array.isArray(rootManifest?.workspaces)
    ? rootManifest.workspaces
    : rootManifest?.workspaces?.packages;

  for (const pattern of workspaces ?? []) {
    if (typeof pattern !== "string" || pattern.startsWith("!")) continue;
    const normalized = pattern.replace(/\\/g, "/");
    const star = normalized.indexOf("*");
    if (star < 0) {
      if (normalized.endsWith("package.json")) active.add(normalized);
      continue;
    }

    const base = normalized.slice(0, star).replace(/\/$/, "");
    if (!existsSync(path.join(root, base))) continue;
    for (const entry of readdirSync(path.join(root, base), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const relativePath = `${base}/${entry.name}/package.json`;
      if (existsSync(path.join(root, relativePath))) active.add(relativePath);
    }
  }

  return active;
}

function previousEntries(manifest) {
  return new Map(
    dependencyEntries(manifest).map((entry) => [
      `${entry.section}:${entry.name}`,
      entry.spec,
    ]),
  );
}

const root = findRoot();
const staged = stagedPaths(root);
if (staged.length === 0) {
  console.log("OK: no staged files; staged catalog policy skipped");
  process.exit(0);
}

const rootText =
  readStaged(root, "package.json") ??
  readFileSync(path.join(root, "package.json"), "utf8");
let rootManifest;
try {
  rootManifest = parseManifest(rootText, "package.json");
} catch (error) {
  console.error(`Commit blocked: ${error.message}`);
  process.exit(1);
}

const lookup = catalogLookup(rootManifest);
if (lookup.size === 0) {
  console.log("OK: no workspace catalog configured");
  process.exit(0);
}

const active = activeManifestPaths(root, rootManifest);
const errors = [];

for (const relativePath of staged.filter(
  (file) => file.endsWith("/package.json") || file === "package.json",
)) {
  if (!active.has(relativePath)) continue;

  let current;
  try {
    current = parseManifest(readStaged(root, relativePath), relativePath);
  } catch (error) {
    errors.push(error.message);
    continue;
  }
  if (!current) continue;

  let previous = null;
  const headText = readHead(root, relativePath);
  if (headText) {
    try {
      previous = JSON.parse(headText);
    } catch {
      previous = null;
    }
  }

  const before = previousEntries(previous ?? {});
  for (const entry of dependencyEntries(current)) {
    const catalogEntry = lookup.get(entry.name);
    if (!catalogEntry) continue;

    const oldSpec = before.get(`${entry.section}:${entry.name}`);
    const changed = oldSpec !== entry.spec;
    const isNewManifest = previous === null;
    if ((changed || isNewManifest) && !isCatalogReference(entry.spec)) {
      errors.push(
        `${relativePath} ${entry.section}.${entry.name}=${JSON.stringify(entry.spec)} must use ${catalogEntry.reference}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(
    "Commit blocked: staged installable dependencies bypass the workspace catalog.\n",
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: staged catalog policy passed");
