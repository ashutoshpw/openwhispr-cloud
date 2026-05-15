import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function teardownObjectStorage(rootDir: string): void {
  const packageDir = join(rootDir, "packages", "object-storage");
  if (existsSync(packageDir)) {
    rmSync(packageDir, { recursive: true, force: true });
  }

  const nextAppPkgPath = join(rootDir, "apps", "next-app", "package.json");
  if (existsSync(nextAppPkgPath)) {
    const pkg = JSON.parse(readFileSync(nextAppPkgPath, "utf-8"));
    for (const dep of ["@repo/object-storage", "@vercel/blob"]) {
      delete pkg.dependencies?.[dep];
      delete pkg.devDependencies?.[dep];
    }
    writeFileSync(nextAppPkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  }

  const storagePage = join(
    rootDir,
    "apps",
    "next-app",
    "src",
    "app",
    "dashboard",
    "[workspaceSlug]",
    "~",
    "storage",
  );
  if (existsSync(storagePage)) {
    rmSync(storagePage, { recursive: true, force: true });
  }

  const storageApi = join(
    rootDir,
    "apps",
    "next-app",
    "src",
    "app",
    "api",
    "storage",
  );
  if (existsSync(storageApi)) {
    rmSync(storageApi, { recursive: true, force: true });
  }

  execFileSync("bun", ["install"], { cwd: rootDir, stdio: "inherit" });
}
