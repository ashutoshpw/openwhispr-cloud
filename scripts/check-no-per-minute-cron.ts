#!/usr/bin/env bun

/**
 * Pre-commit hook: block per-minute cron schedules in staged additions.
 *
 * Scans only added lines in the cached diff for 5-field cron expressions
 * where the minute field is "*" or "star-slash-1" (every minute).
 */

import { execFileSync, execSync } from "node:child_process";

const CRON_PROPERTY = /cron:\s*["']([^"']+)["']/gi;
const VERCEL_SCHEDULE = /"schedule"\s*:\s*"([^"]+)"/gi;

interface Violation {
  file: string;
  expression: string;
}

function getStagedFiles(): string[] {
  const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf8",
  }).trim();
  if (!output) return [];
  return output
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
}

function getAddedLines(file: string): string[] {
  try {
    const diff = execFileSync("git", ["diff", "--cached", "-U0", "--", file], {
      encoding: "utf8",
    });
    return diff
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1));
  } catch {
    return [];
  }
}

function isPerMinuteCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const minute = parts[0];
  return minute === "*" || minute === "*/1";
}

function extractCronExpressions(line: string): string[] {
  const expressions: string[] = [];

  for (const pattern of [CRON_PROPERTY, VERCEL_SCHEDULE]) {
    pattern.lastIndex = 0;
    let match = pattern.exec(line);
    while (match !== null) {
      expressions.push(match[1]);
      match = pattern.exec(line);
    }
  }

  return expressions;
}

const violations: Violation[] = [];

for (const file of getStagedFiles()) {
  for (const line of getAddedLines(file)) {
    for (const expression of extractCronExpressions(line)) {
      if (isPerMinuteCron(expression)) {
        violations.push({ file, expression });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    "\nCommit blocked: per-minute cron schedules are not allowed.\n",
  );
  console.error(
    "The minute field must not be `*` or `*/1`. Use hourly or less frequent schedules.\n",
  );

  for (const { file, expression } of violations) {
    console.error(`  x ${file}`);
    console.error(`    Expression: "${expression}"`);
    console.error(
      '    Examples:   "0 * * * *" (hourly), "0 0 * * *" (daily)\n',
    );
  }

  process.exit(1);
}
