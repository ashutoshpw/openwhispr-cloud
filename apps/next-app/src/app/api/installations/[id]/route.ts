import { loadAuthorizedInstallation } from "@/lib/integrations/access";
import { encryptJson } from "@/lib/integrations/encryption";
import { toSafeInstallation } from "@/lib/integrations/types";
import { db, eq } from "@repo/database";
import {
  type IntegrationInstallation,
  integrationInstallation,
} from "@repo/database/schema";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/installations/[id]
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await loadAuthorizedInstallation(id);
  if ("error" in result) return result.error;
  return NextResponse.json(toSafeInstallation(result.row));
}

/**
 * PATCH /api/installations/[id]
 * Body may include: displayName, configPublic, secretConfig, status.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await loadAuthorizedInstallation(id, {
    requireWriteRole: true,
  });
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { displayName, configPublic, secretConfig, status } = body as {
    displayName?: string;
    configPublic?: Record<string, unknown>;
    secretConfig?: Record<string, unknown> | null;
    status?: "active" | "disabled";
  };

  const update: Partial<IntegrationInstallation> = {};
  if (typeof displayName === "string") update.displayName = displayName;
  if (configPublic && typeof configPublic === "object") {
    update.configPublic = configPublic;
  }
  if (secretConfig !== undefined) {
    update.configEncrypted = secretConfig ? encryptJson(secretConfig) : null;
  }
  if (status === "active" || status === "disabled") {
    update.status = status;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const [updated] = await db()
    .update(integrationInstallation)
    .set(update)
    .where(eq(integrationInstallation.id, id))
    .returning();

  return NextResponse.json(toSafeInstallation(updated));
}

/**
 * DELETE /api/installations/[id]
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await loadAuthorizedInstallation(id, {
    requireWriteRole: true,
  });
  if ("error" in result) return result.error;
  if (result.row.isSystemManaged) {
    return NextResponse.json(
      { error: "System-managed installations cannot be deleted." },
      { status: 400 },
    );
  }
  await db()
    .delete(integrationInstallation)
    .where(eq(integrationInstallation.id, id));
  return NextResponse.json({ success: true });
}
