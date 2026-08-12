#!/usr/bin/env bun

/**
 * Pre-commit hook: block banned dependencies in apps/[*]/package.json.
 *
 * Enforces that apps import from shared workspace packages instead of
 * reaching for the underlying libraries directly.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

interface BannedRule {
  /** Glob-style pattern: exact string or ends-with-* prefix match */
  pattern: string;
  reason: string;
  alternative: string;
}

const BANNED_RULES: BannedRule[] = [
  // Analytics
  {
    pattern: "@vercel/analytics",
    reason: "Use @repo/analytics instead",
    alternative: "@repo/analytics",
  },
  {
    pattern: "posthog-js",
    reason: "Use @repo/analytics instead",
    alternative: "@repo/analytics",
  },
  {
    pattern: "posthog-node",
    reason: "Use @repo/analytics instead",
    alternative: "@repo/analytics",
  },
  // Durable execution
  {
    pattern: "inngest",
    reason: "Use @repo/durable-exec instead",
    alternative: "@repo/durable-exec",
  },
  {
    pattern: "trigger-dev",
    reason: "Use @repo/durable-exec instead",
    alternative: "@repo/durable-exec",
  },
  {
    pattern: "@trigger.dev/*",
    reason: "Use @repo/durable-exec instead",
    alternative: "@repo/durable-exec",
  },
  {
    pattern: "bullmq",
    reason: "Use @repo/durable-exec instead",
    alternative: "@repo/durable-exec",
  },
  {
    pattern: "temporal-*",
    reason: "Use @repo/durable-exec instead",
    alternative: "@repo/durable-exec",
  },
  // AI
  {
    pattern: "@ai-sdk/*",
    reason: "Use @repo/ai instead",
    alternative: "@repo/ai",
  },
  {
    pattern: "ai",
    reason: 'Use @repo/ai instead (exact package named "ai")',
    alternative: "@repo/ai",
  },
  {
    pattern: "langchain",
    reason: "Use @repo/ai instead",
    alternative: "@repo/ai",
  },
  {
    pattern: "langchain-*",
    reason: "Use @repo/ai instead",
    alternative: "@repo/ai",
  },
  {
    pattern: "@langchain/*",
    reason: "Use @repo/ai instead",
    alternative: "@repo/ai",
  },
  {
    pattern: "mastra",
    reason: "Use @repo/ai instead",
    alternative: "@repo/ai",
  },
  {
    pattern: "llamaindex",
    reason: "Use @repo/ai instead",
    alternative: "@repo/ai",
  },
  // Date utilities
  {
    pattern: "dayjs",
    reason: "Use date-fns instead (already a dependency)",
    alternative: "date-fns",
  },
  // Billing
  {
    pattern: "stripe",
    reason: "Use @repo/billing instead",
    alternative: "@repo/billing",
  },
  // Object Storage — only allowed in packages/object-storage
  {
    pattern: "@vercel/blob",
    reason: "Use @repo/object-storage instead",
    alternative: "@repo/object-storage",
  },
  {
    pattern: "@aws-lite/client",
    reason: "Use @repo/object-storage instead",
    alternative: "@repo/object-storage",
  },
  {
    pattern: "@aws-lite/*",
    reason: "Use @repo/object-storage instead",
    alternative: "@repo/object-storage",
  },
  {
    pattern: "@aws-sdk/client-s3",
    reason: "Use @repo/object-storage instead",
    alternative: "@repo/object-storage",
  },
  {
    pattern: "@aws-sdk/s3-*",
    reason: "Use @repo/object-storage instead",
    alternative: "@repo/object-storage",
  },
];

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

function matchesBannedPattern(pkg: string, pattern: string): boolean {
  if (pattern.endsWith("/*")) {
    // Scope wildcard: @ai-sdk/* matches @ai-sdk/openai etc.
    const prefix = pattern.slice(0, -2);
    return pkg === prefix || pkg.startsWith(`${prefix}/`);
  }
  if (pattern.endsWith("-*")) {
    // Prefix wildcard: temporal-* matches temporal-worker etc.
    const prefix = pattern.slice(0, -1);
    return pkg.startsWith(prefix);
  }
  // Exact match
  return pkg === pattern;
}

interface Violation {
  file: string;
  pkg: string;
  rule: BannedRule;
}

const stagedFiles = getStagedFiles();
const packageJsonFiles = stagedFiles.filter((f) =>
  /^apps\/[^/]+\/package\.json$/.test(f),
);

const violations: Violation[] = [];

for (const file of packageJsonFiles) {
  if (!existsSync(file)) continue;

  let parsed: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    continue;
  }

  const allDeps = {
    ...parsed.dependencies,
    ...parsed.devDependencies,
  };

  for (const pkg of Object.keys(allDeps)) {
    for (const rule of BANNED_RULES) {
      if (matchesBannedPattern(pkg, rule.pattern)) {
        violations.push({ file, pkg, rule });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    "\nCommit blocked: banned dependencies found in apps/*/package.json.\n",
  );
  console.error(
    "These packages must be imported from their shared workspace package:\n",
  );

  for (const { file, pkg, rule } of violations) {
    console.error(`  ✗ ${file}`);
    console.error(`    Package: "${pkg}"`);
    console.error(`    Reason:  ${rule.reason}`);
    console.error(`    Use:     "${rule.alternative}"\n`);
  }

  console.error(
    "Add the dependency to the appropriate packages/* workspace package instead.",
  );
  console.error(
    "Object storage libs (@vercel/blob, aws-lite, @aws-sdk/client-s3) belong exclusively in packages/object-storage.",
  );
  console.error("See AGENTS.md for the full list of package boundaries.\n");

  process.exit(1);
}
