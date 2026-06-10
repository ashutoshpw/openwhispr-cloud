#!/usr/bin/env bun

import { readFileSync } from "node:fs";

const allowedTypes = new Set([
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
  "wip",
]);

const messageFile = process.argv[2];

if (!messageFile) {
  process.exit(0);
}

const raw = readFileSync(messageFile, "utf8");
const firstLine = raw.split(/\r?\n/)[0].trim();

if (!firstLine) {
  console.error("Commit blocked: commit message is empty.");
  process.exit(1);
}

if (firstLine.startsWith("Merge ")) {
  process.exit(0);
}

const maxLength = 72;
const pattern = new RegExp(
  `^(?:${[...allowedTypes].join("|")})(?:\\([^\\)]+\\))?: .+$`,
);

if (firstLine.length > maxLength) {
  console.error("Commit blocked: first line must be 72 characters or fewer.");
  process.exit(1);
}

if (!pattern.test(firstLine)) {
  console.error(
    "Commit blocked: commit message must follow Conventional Commit format.\n",
  );
  console.error(
    'Example: "feat(auth): add oauth login", "fix: resolve race condition", "chore: update docs".',
  );
  console.error(`Allowed types: ${[...allowedTypes].sort().join(", ")}`);
  process.exit(1);
}

if (/\.$/.test(firstLine)) {
  console.error("Commit blocked: commit subject should not end with a period.");
  process.exit(1);
}
