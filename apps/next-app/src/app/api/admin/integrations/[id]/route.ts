import { isSiteAdmin } from "@/lib/auth-utils";
import { db, eq } from "@repo/database";
import { integration, integrationInstallation } from "@repo/database/schema";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const [row] = await db()
    .select()
    .from(integration)
    .where(eq(integration.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const allowed = [
    "name",
    "description",
    "category",
    "iconUrl",
    "docsUrl",
    "status",
    "isSystemManaged",
    "configSchema",
    "metadata",
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = (body as Record<string, unknown>)[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }
  const [row] = await db()
    .update(integration)
    .set(update)
    .where(eq(integration.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const installs = await db()
    .select({ id: integrationInstallation.id })
    .from(integrationInstallation)
    .where(eq(integrationInstallation.integrationId, id))
    .limit(1);
  if (installs.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete: installations exist for this integration." },
      { status: 400 },
    );
  }
  await db().delete(integration).where(eq(integration.id, id));
  return NextResponse.json({ success: true });
}
