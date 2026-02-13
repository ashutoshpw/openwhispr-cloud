import {
  type Dirent,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";

export function ensureDirectoryExists(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function copyDirectoryRecursive(src: string, dest: string): string[] {
  const copied: string[] = [];

  if (!existsSync(src)) {
    return copied;
  }

  ensureDirectoryExists(dest);
  const entries: Dirent[] = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copied.push(...copyDirectoryRecursive(srcPath, destPath));
    } else {
      ensureDirectoryExists(destPath);
      copyFileSync(srcPath, destPath);
      copied.push(destPath);
    }
  }

  return copied;
}
