#!/usr/bin/env bun

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const MAX_LINES = 600;
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);

function countLines(text: string): number {
  if (text.length === 0) return 0;
  const newlineCount = (text.match(/\n/g) ?? []).length;
  return text.endsWith('\n') ? newlineCount : newlineCount + 1;
}

function getStagedFiles(): string[] {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    encoding: 'utf8',
  }).trim();

  if (!output) return [];

  return output
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
}

function hasCodeExtension(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = filePath.slice(dotIndex);
  return CODE_EXTENSIONS.has(ext);
}

const stagedFiles = getStagedFiles();
const codeFiles = stagedFiles.filter(
  (file) => hasCodeExtension(file) && existsSync(file),
);

if (codeFiles.length === 0) {
  process.exit(0);
}

const violations: Array<{ file: string; lines: number }> = [];

for (const file of codeFiles) {
  const content = readFileSync(file, 'utf8');
  const lineCount = countLines(content);

  if (lineCount > MAX_LINES) {
    violations.push({ file, lines: lineCount });
  }
}

if (violations.length > 0) {
  console.error(`\nCommit blocked: code files must be <= ${MAX_LINES} lines.\n`);

  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.lines} lines`);
  }

  console.error('\nSplit large files before committing.');
  process.exit(1);
}
