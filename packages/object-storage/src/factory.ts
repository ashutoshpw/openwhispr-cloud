import type { StorageClient } from "./types";

export type StorageProvider = "vercel-blob" | "s3";

export function createStorageClient(): StorageClient {
  const provider = (process.env.OBJECT_STORAGE_PROVIDER ??
    "vercel-blob") as StorageProvider;

  if (provider === "s3") {
    const { s3Provider } = require("./providers/s3");
    return s3Provider;
  }

  const { vercelBlobProvider } = require("./providers/vercel-blob");
  return vercelBlobProvider;
}
