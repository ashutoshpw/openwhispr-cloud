import { syncError } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import {
  type Member,
  type Organization,
  member,
  organization,
} from "@repo/database/schema";
import type { SessionUser } from "./types";

export type OrgContext = {
  org: Organization;
  membership: Member;
  isAdmin: boolean;
};

const ADMIN_ROLES = new Set(["owner", "admin"]);

export async function requireOrgMembership(
  user: SessionUser,
  orgId: string,
): Promise<OrgContext | null> {
  const [row] = await db()
    .select({ org: organization, membership: member })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(and(eq(organization.id, orgId), eq(member.userId, user.id)))
    .limit(1);
  if (!row) return null;
  return {
    org: row.org,
    membership: row.membership,
    isAdmin: ADMIN_ROLES.has(row.membership.role),
  };
}

import { withSession } from "./session";

export function withOrg(
  request: Request,
  orgId: string,
  handler: (user: SessionUser, ctx: OrgContext) => Promise<Response>,
): Promise<Response> {
  return withSession(request, async (user) => {
    const ctx = await requireOrgMembership(user, orgId);
    if (!ctx) return notFoundResponse();
    return handler(user, ctx);
  });
}

export function withOrgAdmin(
  request: Request,
  orgId: string,
  handler: (user: SessionUser, ctx: OrgContext) => Promise<Response>,
): Promise<Response> {
  return withSession(request, async (user) => {
    const ctx = await requireOrgMembership(user, orgId);
    if (!ctx) return notFoundResponse();
    if (!ctx.isAdmin) return forbidden();
    return handler(user, ctx);
  });
}

function notFoundResponse(): Response {
  return syncError(404, "Workspace not found");
}

export function notFound(): Response {
  return syncError(404, "Workspace not found");
}

export function forbidden(): Response {
  return syncError(403, "Insufficient role");
}
