/**
 * AES-256-GCM helpers for AIEO secrets at rest. Uses a dedicated
 * AIEO_ENCRYPTION_KEY (32-byte hex) and stores `{ciphertext, iv, authTag}`
 * in dedicated columns on seo_secrets.
 */

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.AIEO_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "AIEO_ENCRYPTION_KEY missing. Generate with `openssl rand -hex 32` and set in env.",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("AIEO_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedTriple {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encrypt(plaintext: string): EncryptedTriple {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encrypt: plaintext must be a non-empty string");
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decrypt(triple: EncryptedTriple): string {
  const key = getKey();
  const iv = Buffer.from(triple.iv, "base64");
  const authTag = Buffer.from(triple.authTag, "base64");
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("decrypt: invalid auth tag length");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const dec = Buffer.concat([
    decipher.update(Buffer.from(triple.ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function maskValue(plaintext: string): string {
  if (!plaintext) return "";
  if (plaintext.length <= 4) return "••••";
  return `••••${plaintext.slice(-4)}`;
}
