import type {
  Integration,
  IntegrationInstallation,
} from "@repo/database/schema";

export type IntegrationCategory =
  | "email"
  | "crm"
  | "analytics"
  | "tools"
  | "other";

export type IntegrationStatus = "active" | "beta" | "deprecated" | "hidden";

export type InstallationStatus = "active" | "error" | "disabled";

export type IntegrationMetadata = {
  hidden?: boolean;
  authType?: "byo" | "oauth" | "platform";
  features?: string[];
  requirements?: string[];
  pricing?: string;
  [key: string]: unknown;
};

/**
 * Public-safe view of an installation (never includes configEncrypted).
 */
export type SafeInstallation = Omit<
  IntegrationInstallation,
  "configEncrypted"
> & {
  hasSecret: boolean;
};

export type InstallationWithIntegration = SafeInstallation & {
  integration: Integration;
};

export type IntegrationWithInstallations = Integration & {
  installations: SafeInstallation[];
};

export type InstallIntegrationInput = {
  integrationSlug: string;
  organizationId: string;
  /** null/undefined for workspace-scoped install */
  projectId?: string | null;
  displayName?: string;
  config: Record<string, unknown>;
};

export type CustomMCPServerConfig = {
  endpointUrl: string;
  authType: "none" | "bearer" | "apiKey" | "basic";
  credentials?: string;
  headers?: Record<string, string>;
  toolAllowlist?: string[];
};

export function toSafeInstallation(
  row: IntegrationInstallation,
): SafeInstallation {
  const { configEncrypted, ...rest } = row;
  return { ...rest, hasSecret: Boolean(configEncrypted) };
}
