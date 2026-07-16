#!/usr/bin/env bun

import { execFileSync } from "node:child_process";

const IGNORED_PREFIXES = [".agents/", ".claude/"];
const EXEMPT_ROOT_MARKDOWN = new Set([
  "README.md",
  "LICENCE.md",
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
]);

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

  if (EXEMPT_ROOT_MARKDOWN.has(file)) return false;
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
