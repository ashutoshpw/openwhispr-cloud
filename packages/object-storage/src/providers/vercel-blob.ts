import { del, head, list, put } from "@vercel/blob";
import type {
  FileMetadata,
  ListOptions,
  ListResult,
  StorageAcl,
  StorageClient,
  UploadOptions,
} from "../types";

function requireToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Configure it in .env.local.",
    );
  }
  return token;
}

export const vercelBlobProvider: StorageClient = {
  async uploadFile(key, body, options?: UploadOptions): Promise<FileMetadata> {
    const token = requireToken();
    const blob = await put(key, body as Parameters<typeof put>[1], {
      token,
      access: options?.acl === "private" ? "private" : "public",
      contentType: options?.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    // put() returns pathname, url, downloadUrl, contentType, contentDisposition — no size
    // Fetch size via head() to populate FileMetadata
    const meta = await head(blob.url, { token });
    return {
      key: blob.pathname,
      url: blob.url,
      size: meta.size,
      contentType: blob.contentType,
      uploadedAt: meta.uploadedAt,
    };
  },

  async uploadMultipart(
    key,
    body,
    options?: UploadOptions,
  ): Promise<FileMetadata> {
    // @vercel/blob supports multipart transparently via put(..., { multipart: true })
    const token = requireToken();
    const blob = await put(key, body as Parameters<typeof put>[1], {
      token,
      access: options?.acl === "private" ? "private" : "public",
      contentType: options?.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: true,
    });
    const meta = await head(blob.url, { token });
    return {
      key: blob.pathname,
      url: blob.url,
      size: meta.size,
      contentType: blob.contentType,
      uploadedAt: meta.uploadedAt,
    };
  },

  async downloadSigned(key, expiresInSeconds = 3600): Promise<string> {
    // Vercel Blob private blobs are served through our own API proxy which adds the token.
    // Public blobs are directly accessible; we still route through the proxy for a uniform interface.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const params = new URLSearchParams({ key, expires: String(expires) });
    return `${appUrl}/api/storage/signed?${params}`;
  },

  async listFiles(options?: ListOptions): Promise<ListResult> {
    const token = requireToken();
    const result = await list({
      token,
      prefix: options?.prefix,
      limit: options?.limit ?? 100,
      cursor: options?.cursor,
    });
    // ListBlobResultBlob has: url, downloadUrl, pathname, size, uploadedAt, etag (no contentType)
    return {
      files: result.blobs.map((b) => ({
        key: b.pathname,
        url: b.url,
        size: b.size,
        uploadedAt: new Date(b.uploadedAt),
      })),
      cursor: result.cursor,
      hasMore: result.hasMore,
    };
  },

  async deleteFile(key): Promise<void> {
    const token = requireToken();
    await del(key, { token });
  },

  async setAcl(_key, _acl: StorageAcl): Promise<void> {
    // Vercel Blob ACL is set at upload time via put()'s `access` option.
    // Post-upload ACL changes are not supported by the Vercel Blob API.
    throw new Error(
      "Vercel Blob does not support changing ACL after upload. Set acl in uploadFile options.",
    );
  },
};
