import { and, db, eq, isNull } from "@repo/database";
import {
  type IntegrationInstallation,
  integration,
  integrationInstallation,
} from "@repo/database/schema";
import { nanoid } from "nanoid";
import { decryptJson, encryptJson } from "./encryption";
import { getProviderHandler } from "./provider-handlers";
import { type SafeInstallation, toSafeInstallation } from "./types";

export type CreateInstallationParams = {
  integrationSlug: string;
  organizationId: string;
  projectId?: string | null;
  displayName?: string | null;
  config: Record<string, unknown>;
};

export type CreateInstallationResult =
  | { ok: true; installation: SafeInstallation }
  | { ok: false; status: number; error: string };

export async function createInstallation(
  params: CreateInstallationParams,
): Promise<CreateInstallationResult> {
  const [intg] = await db()
    .select()
    .from(integration)
    .where(eq(integration.slug, params.integrationSlug))
    .limit(1);
  if (!intg) {
    return { ok: false, status: 404, error: "Integration not found." };
  }
  if (intg.status === "deprecated") {
    return {
      ok: false,
      status: 400,
      error: "Integration is deprecated and cannot be installed.",
    };
  }

  const handler = getProviderHandler(params.integrationSlug);
  if (!handler) {
    return {
      ok: false,
      status: 400,
      error: `No handler registered for '${params.integrationSlug}'.`,
    };
  }

  try {
    handler.validate(params.config);
  } catch (err) {
    return {
      ok: false,
      status: 400,
      error: err instanceof Error ? err.message : "Invalid configuration.",
    };
  }

  // Reject duplicate (scope, integration, displayName) early
  const projectFilter = params.projectId
    ? eq(integrationInstallation.projectId, params.projectId)
    : isNull(integrationInstallation.projectId);
  const existing = await db()
    .select()
    .from(integrationInstallation)
    .where(
      and(
        eq(integrationInstallation.integrationId, intg.id),
        eq(integrationInstallation.organizationId, params.organizationId),
        projectFilter,
      ),
    );
  const displayName = params.displayName ?? intg.name;
  if (existing.some((row) => row.displayName === displayName)) {
    return {
      ok: false,
      status: 409,
      error: "An installation with this name already exists at this scope.",
    };
  }

  const verify = await handler.verify(params.config);
  if (!verify.ok) {
    return { ok: false, status: 400, error: verify.error };
  }

  const { secret, publicConfig } = handler.splitConfig(params.config);

  const [row] = await db()
    .insert(integrationInstallation)
    .values({
      id: nanoid(),
      integrationId: intg.id,
      organizationId: params.organizationId,
      projectId: params.projectId ?? null,
      displayName,
      configEncrypted: secret ? encryptJson(secret) : null,
      configPublic: publicConfig,
      status: "active",
      lastVerifiedAt: new Date(),
      lastError: null,
      isSystemManaged: false,
    })
    .returning();

  return { ok: true, installation: toSafeInstallation(row) };
}

export async function reverifyInstallation(
  installation: IntegrationInstallation,
  integrationSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const handler = getProviderHandler(integrationSlug);
  if (!handler) {
    return { ok: false, error: "No handler available." };
  }
  const secret = installation.configEncrypted
    ? (decryptJson(installation.configEncrypted) as Record<string, unknown>)
    : {};
  const merged = {
    ...((installation.configPublic as Record<string, unknown>) ?? {}),
    ...secret,
  };
  const result = await handler.verify(merged);
  await db()
    .update(integrationInstallation)
    .set({
      status: result.ok ? "active" : "error",
      lastVerifiedAt: new Date(),
      lastError: result.ok ? null : result.error,
    })
    .where(eq(integrationInstallation.id, installation.id));
  return result;
}
