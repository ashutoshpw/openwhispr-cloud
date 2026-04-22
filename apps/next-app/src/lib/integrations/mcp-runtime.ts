import { and, db, eq, isNull, or } from "@repo/database";
import { integration, integrationInstallation } from "@repo/database/schema";
import { decryptJson } from "./encryption";
import type { CustomMCPServerConfig } from "./types";

/**
 * Resolved MCP server connection ready to be consumed by an MCP client.
 *
 * Includes decrypted credentials. Treat as sensitive — never log or
 * return to the browser.
 */
export type LoadedMCPServer = {
  installationId: string;
  displayName: string;
  endpointUrl: string;
  authType: CustomMCPServerConfig["authType"];
  /** Final HTTP headers to send (incl. auth header), keyed by name. */
  headers: Record<string, string>;
  /** Optional allowlist of tool names; null/undefined means allow all. */
  toolAllowlist: string[] | null;
};

const CUSTOM_MCP_SLUG = "custom-mcp-server";

function buildHeaders(cfg: CustomMCPServerConfig): Record<string, string> {
  const headers: Record<string, string> = { ...(cfg.headers ?? {}) };
  if (cfg.authType === "bearer" && cfg.credentials) {
    headers.Authorization = `Bearer ${cfg.credentials}`;
  } else if (cfg.authType === "apiKey" && cfg.credentials) {
    headers["X-API-Key"] = cfg.credentials;
  } else if (cfg.authType === "basic" && cfg.credentials) {
    headers.Authorization = `Basic ${Buffer.from(cfg.credentials).toString(
      "base64",
    )}`;
  }
  return headers;
}

/**
 * Load all custom MCP server installations visible to the given scope.
 *
 * Project scope returns project-scoped + workspace-scoped servers (project
 * takes precedence on display-name collisions). Workspace scope returns
 * workspace-scoped only. Disabled / errored installations are skipped.
 */
export async function loadMCPServers(scope: {
  organizationId: string;
  projectId?: string | null;
}): Promise<LoadedMCPServer[]> {
  const projectFilter = scope.projectId
    ? or(
        eq(integrationInstallation.projectId, scope.projectId),
        isNull(integrationInstallation.projectId),
      )
    : isNull(integrationInstallation.projectId);

  const rows = await db()
    .select({ installation: integrationInstallation, integration: integration })
    .from(integrationInstallation)
    .innerJoin(
      integration,
      eq(integrationInstallation.integrationId, integration.id),
    )
    .where(
      and(
        eq(integration.slug, CUSTOM_MCP_SLUG),
        eq(integrationInstallation.organizationId, scope.organizationId),
        eq(integrationInstallation.status, "active"),
        projectFilter,
      ),
    );

  // Project-scoped installs override workspace-scoped on displayName collision.
  const byName = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = row.installation.displayName ?? row.installation.id;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, row);
      continue;
    }
    const incomingIsProject = row.installation.projectId !== null;
    const existingIsProject = existing.installation.projectId !== null;
    if (incomingIsProject && !existingIsProject) byName.set(key, row);
  }

  const servers: LoadedMCPServer[] = [];
  for (const row of Array.from(byName.values())) {
    const publicCfg =
      (row.installation.configPublic as Partial<CustomMCPServerConfig>) ?? {};
    const secret = row.installation.configEncrypted
      ? (decryptJson(row.installation.configEncrypted) as Partial<
          Pick<CustomMCPServerConfig, "credentials">
        >)
      : {};
    const cfg: CustomMCPServerConfig = {
      endpointUrl: publicCfg.endpointUrl ?? "",
      authType: publicCfg.authType ?? "none",
      credentials: secret.credentials,
      headers: publicCfg.headers ?? {},
      toolAllowlist: publicCfg.toolAllowlist ?? undefined,
    };
    if (!cfg.endpointUrl) continue;
    servers.push({
      installationId: row.installation.id,
      displayName: row.installation.displayName ?? row.integration.name,
      endpointUrl: cfg.endpointUrl,
      authType: cfg.authType,
      headers: buildHeaders(cfg),
      toolAllowlist:
        cfg.toolAllowlist && cfg.toolAllowlist.length > 0
          ? cfg.toolAllowlist
          : null,
    });
  }
  return servers;
}
