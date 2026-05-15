#!/usr/bin/env bun

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const TYPE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const cwd = process.cwd();

const SKIP_PATH_PREFIXES = [".setup/templates/"];

function isSkippedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return SKIP_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function runGitCommand(command: string): string {
  return execSync(command, { encoding: "utf8" }).trim();
}

function getStagedFiles(): string[] {
  const output = runGitCommand(
    "git diff --cached --name-only --diff-filter=ACMR",
  );
  if (!output) return [];

  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function hasTypeExtension(filePath: string): boolean {
  return TYPE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function normalize(filePath: string): string {
  return path.normalize(path.resolve(filePath));
}

function findNearestTsconfig(filePath: string): string | null {
  let current = path.dirname(normalize(filePath));
  const root = normalize(cwd);

  while (true) {
    const candidate = path.join(current, "tsconfig.json");
    if (existsSync(candidate)) return candidate;

    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  const rootTsconfig = path.join(root, "tsconfig.json");
  return existsSync(rootTsconfig) ? rootTsconfig : null;
}

function groupFilesByTsconfig(files: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const file of files) {
    const tsconfigPath = findNearestTsconfig(file);
    if (!tsconfigPath) continue;

    const existing = grouped.get(tsconfigPath) ?? [];
    existing.push(file);
    grouped.set(tsconfigPath, existing);
  }

  return grouped;
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return `TS${diagnostic.code}: ${message}`;
  }

  const relativeFile = path.relative(cwd, diagnostic.file.fileName);
  const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${relativeFile}:${pos.line + 1}:${pos.character + 1} TS${diagnostic.code}: ${message}`;
}

function checkFileGroup(tsconfigPath: string, stagedFiles: string[]): string[] {
  const configResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configResult.error) {
    return [formatDiagnostic(configResult.error)];
  }

  const parsed = ts.parseJsonConfigFileContent(
    configResult.config,
    ts.sys,
    path.dirname(tsconfigPath),
    {
      noEmit: true,
      incremental: false,
      composite: false,
      tsBuildInfoFile: undefined,
    },
    tsconfigPath,
  );

  const rootNames = stagedFiles.map((file) => normalize(file));
  const stagedSet = new Set(rootNames);
  const options: ts.CompilerOptions = {
    ...parsed.options,
    noEmit: true,
    incremental: false,
    composite: false,
    tsBuildInfoFile: undefined,
    types: Array.from(new Set([...(parsed.options.types ?? []), "node"])),
  };
  const program = ts.createProgram({
    rootNames,
    options,
  });

  const diagnostics = ts.getPreEmitDiagnostics(program);
  const filtered = diagnostics.filter((diagnostic) => {
    if (!diagnostic.file) return false;
    return stagedSet.has(normalize(diagnostic.file.fileName));
  });

  return filtered.map(formatDiagnostic);
}

const stagedFiles = getStagedFiles();
const stagedTypeFiles = stagedFiles.filter(
  (file) => hasTypeExtension(file) && existsSync(file) && !isSkippedPath(file),
);

if (stagedTypeFiles.length === 0) {
  process.exit(0);
}

const groupedFiles = groupFilesByTsconfig(stagedTypeFiles);
const errors: string[] = [];

for (const [tsconfigPath, files] of groupedFiles.entries()) {
  const groupErrors = checkFileGroup(tsconfigPath, files);
  errors.push(...groupErrors);
}

if (errors.length > 0) {
  console.error(
    "\nCommit blocked: staged TypeScript files contain type errors.\n",
  );
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
