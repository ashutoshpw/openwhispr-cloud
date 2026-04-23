import { db, eq, inArray } from "@repo/database";
import { appSettings } from "@repo/database/schema";
import { decrypt, encrypt } from "./integrations/encryption";

export const OPENAI_SETTING_KEYS = {
  BASE_URL: "openai_base_url",
  API_KEY: "openai_api_key",
  DEFAULT_MODEL: "openai_default_model",
} as const;

export type OpenAIConfig = {
  baseUrl: string | null;
  apiKey: string;
  defaultModel: string | null;
};

export type OpenAIConfigMasked = {
  baseUrl: string | null;
  apiKeyLast4: string | null;
  hasApiKey: boolean;
  defaultModel: string | null;
};

async function readOpenAISettings(): Promise<Partial<Record<string, string>>> {
  const rows = await db()
    .select()
    .from(appSettings)
    .where(
      inArray(appSettings.key, [
        OPENAI_SETTING_KEYS.BASE_URL,
        OPENAI_SETTING_KEYS.API_KEY,
        OPENAI_SETTING_KEYS.DEFAULT_MODEL,
      ]),
    );
  const out: Partial<Record<string, string>> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/**
 * Returns the decrypted OpenAI config for runtime use (agent sessions).
 * Throws if the API key has not been configured in the admin portal.
 */
export async function getOpenAIConfig(): Promise<OpenAIConfig> {
  const values = await readOpenAISettings();
  const encryptedKey = values[OPENAI_SETTING_KEYS.API_KEY];
  if (!encryptedKey) {
    throw new Error(
      "OpenAI API key has not been configured. Set it in /adminx/ai-provider.",
    );
  }
  return {
    baseUrl: values[OPENAI_SETTING_KEYS.BASE_URL] ?? null,
    apiKey: decrypt(encryptedKey),
    defaultModel: values[OPENAI_SETTING_KEYS.DEFAULT_MODEL] ?? null,
  };
}

/**
 * Returns a masked version of the config safe to send to the admin UI.
 */
export async function getOpenAIConfigMasked(): Promise<OpenAIConfigMasked> {
  const values = await readOpenAISettings();
  const encryptedKey = values[OPENAI_SETTING_KEYS.API_KEY];
  let apiKeyLast4: string | null = null;
  if (encryptedKey) {
    try {
      const plain = decrypt(encryptedKey);
      apiKeyLast4 = plain.length >= 4 ? plain.slice(-4) : plain;
    } catch {
      apiKeyLast4 = null;
    }
  }
  return {
    baseUrl: values[OPENAI_SETTING_KEYS.BASE_URL] ?? null,
    apiKeyLast4,
    hasApiKey: Boolean(encryptedKey),
    defaultModel: values[OPENAI_SETTING_KEYS.DEFAULT_MODEL] ?? null,
  };
}

export function encryptOpenAIApiKey(plaintext: string): string {
  return encrypt(plaintext);
}

export async function clearOpenAIApiKey(): Promise<void> {
  await db()
    .delete(appSettings)
    .where(eq(appSettings.key, OPENAI_SETTING_KEYS.API_KEY));
}
