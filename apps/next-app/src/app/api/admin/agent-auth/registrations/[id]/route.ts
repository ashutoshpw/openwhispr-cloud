import {
  parseBody,
  requireSiteAdmin,
} from "@/app/api/admin/_lib/resource-crud";
import {
  agentAuthAudit,
  agentRegistration,
  agentToken,
  and,
  db,
  eq,
  isNull,
} from "@repo/database";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const deny = await requireSiteAdmin();
  if (deny) return deny;
  const { id } = await params;
  const bodyOrError = await parseBody(request);
  if (bodyOrError instanceof NextResponse) return bodyOrError;

  const { action } = bodyOrError;
  if (action !== "revoke" && action !== "expire") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const [registration] = await db()
    .select({ tenantId: agentRegistration.tenantId })
    .from(agentRegistration)
    .where(eq(agentRegistration.id, id))
    .limit(1);
  if (!registration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const status = action === "revoke" ? "revoked" : "expired";

  await db()
    .update(agentRegistration)
    .set({ status })
    .where(eq(agentRegistration.id, id));

  if (action === "revoke") {
    await db()
      .update(agentToken)
      .set({ revokedAt: now })
      .where(
        and(eq(agentToken.registrationId, id), isNull(agentToken.revokedAt)),
      );
  }

  await db()
    .insert(agentAuthAudit)
    .values({
      id: `aaudit_${crypto.randomUUID()}`,
      tenantId: registration.tenantId,
      registrationId: id,
      event:
        action === "revoke" ? "registration.revoked" : "registration.expired",
      metadata: { via: "adminx" },
    });

  return NextResponse.json({ success: true });
}
