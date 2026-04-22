import type { CustomMCPServerConfig } from "./types";

export type SplitConfigResult = {
  /** Sensitive fields → encrypted blob */
  secret: Record<string, unknown> | null;
  /** Non-sensitive fields → stored in plain configPublic JSONB */
  publicConfig: Record<string, unknown>;
};

export type VerifyResult = { ok: true } | { ok: false; error: string };

export type ProviderHandler = {
  /**
   * Validate raw config from form. Throws on invalid input.
   */
  validate: (config: Record<string, unknown>) => void;
  /**
   * Split a validated config into secret + public parts.
   */
  splitConfig: (config: Record<string, unknown>) => SplitConfigResult;
  /**
   * Verify the integration is reachable / credentials are valid.
   * Receives merged (secret + public) config.
   */
  verify: (config: Record<string, unknown>) => Promise<VerifyResult>;
};

// ---------------------------------------------------------------------------
// custom-mcp-server
// ---------------------------------------------------------------------------

const customMcpServer: ProviderHandler = {
  validate(config) {
    const { endpointUrl, authType } = config as CustomMCPServerConfig;
    if (typeof endpointUrl !== "string" || endpointUrl.length === 0) {
      throw new Error("endpointUrl is required.");
    }
    try {
      new URL(endpointUrl);
    } catch {
      throw new Error("endpointUrl must be a valid URL.");
    }
    const allowed = ["none", "bearer", "apiKey", "basic"];
    if (typeof authType !== "string" || !allowed.includes(authType)) {
      throw new Error(`authType must be one of: ${allowed.join(", ")}.`);
    }
    if (authType !== "none") {
      const creds = (config as CustomMCPServerConfig).credentials;
      if (typeof creds !== "string" || creds.length === 0) {
        throw new Error("credentials are required for the chosen authType.");
      }
    }
  },
  splitConfig(config) {
    const { credentials, ...rest } = config as CustomMCPServerConfig;
    return {
      secret: credentials ? { credentials } : null,
      publicConfig: rest as Record<string, unknown>,
    };
  },
  async verify(config) {
    const { endpointUrl, authType, credentials, headers } =
      config as CustomMCPServerConfig;
    const reqHeaders: Record<string, string> = { ...(headers ?? {}) };

    if (authType === "bearer" && credentials) {
      reqHeaders.Authorization = `Bearer ${credentials}`;
    } else if (authType === "apiKey" && credentials) {
      reqHeaders["X-API-Key"] = credentials;
    } else if (authType === "basic" && credentials) {
      reqHeaders.Authorization = `Basic ${Buffer.from(credentials).toString("base64")}`;
    }

    try {
      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...reqHeaders },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        return {
          ok: false,
          error: `Server responded with ${res.status} ${res.statusText}.`,
        };
      }
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Could not reach endpoint: ${msg}` };
    }
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const providerHandlers: Record<string, ProviderHandler> = {
  "custom-mcp-server": customMcpServer,
};

export function getProviderHandler(slug: string): ProviderHandler | null {
  return providerHandlers[slug] ?? null;
}
