export interface FileMetadata {
  key: string;
  url: string;
  size: number;
  contentType?: string;
  uploadedAt: Date;
}

export type StorageAcl = "public" | "private";

export interface UploadOptions {
  contentType?: string;
  acl?: StorageAcl;
  metadata?: Record<string, string>;
}

export interface ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface ListResult {
  files: FileMetadata[];
  cursor?: string;
  hasMore: boolean;
}

export interface StorageClient {
  uploadFile(
    key: string,
    body: Blob | Buffer | ReadableStream,
    options?: UploadOptions,
  ): Promise<FileMetadata>;
  uploadMultipart(
    key: string,
    body: Blob | Buffer,
    options?: UploadOptions,
  ): Promise<FileMetadata>;
  downloadSigned(key: string, expiresInSeconds?: number): Promise<string>;
  listFiles(options?: ListOptions): Promise<ListResult>;
  deleteFile(key: string): Promise<void>;
  setAcl(key: string, acl: StorageAcl): Promise<void>;
}
