#!/usr/bin/env bun

import { execFileSync } from "node:child_process";

const IGNORED_PREFIXES = [".agents/", ".claude/"];
const ALLOWED_DOC_ROOTS = ["docs-public/", "docs-internal/"];
const GENERATED_DOC_PATHS = ["apps/next-app/src/app/docs/"];

function getStagedFiles(): string[] {
  const output = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { encoding: "utf8" },
  ).trim();

  if (!output) return [];

  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

const violations = getStagedFiles().filter((file) => {
  if (IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix))) {
    return false;
  }

  if (ALLOWED_DOC_ROOTS.some((prefix) => file.startsWith(prefix))) {
    return false;
  }

  // The app's /docs route is a generated mirror of docs-public, not a
  // hand-maintained documentation tree.
  if (GENERATED_DOC_PATHS.some((prefix) => file.startsWith(prefix))) {
    return false;
  }

  return /(^|\/)docs(?:\/|$)/.test(file);
});

if (violations.length > 0) {
  console.error("\nCommit blocked: generic docs/ paths are not allowed.\n");
  for (const file of violations) {
    console.error(`  x ${file}`);
  }
  console.error(
    "\nUse docs-public/ for public documentation or docs-internal/ for developer and agent documentation.\n",
  );
  process.exit(1);
}
