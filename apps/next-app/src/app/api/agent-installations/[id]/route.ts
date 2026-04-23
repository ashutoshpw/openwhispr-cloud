import { auth } from "@repo/auth/server";
import { agentInstallation, and, db, eq } from "@repo/database";
import { member } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function loadAuthorized(
  installationId: string,
  options: { requireWriteRole?: boolean } = {},
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const [install] = await db()
    .select()
    .from(agentInstallation)
    .where(eq(agentInstallation.id, installationId))
    .limit(1);
  if (!install) {
    return {
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  const [m] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, install.organizationId),
      ),
    )
    .limit(1);
  if (!m) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  if (options.requireWriteRole && m.role !== "owner" && m.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Only owners and admins can modify installations." },
        { status: 403 },
      ),
    };
  }
  return { installation: install };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const loaded = await loadAuthorized(id, { requireWriteRole: true });
  if ("error" in loaded) return loaded.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if ("displayName" in body) update.displayName = body.displayName ?? null;
  if ("configPublic" in body) update.configPublic = body.configPublic ?? null;
  if (
    "status" in body &&
    (body.status === "active" || body.status === "disabled")
  ) {
    update.status = body.status;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }
  const [row] = await db()
    .update(agentInstallation)
    .set(update)
    .where(eq(agentInstallation.id, id))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const loaded = await loadAuthorized(id, { requireWriteRole: true });
  if ("error" in loaded) return loaded.error;

  await db().delete(agentInstallation).where(eq(agentInstallation.id, id));
  return NextResponse.json({ success: true });
}
