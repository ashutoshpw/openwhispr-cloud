import { auth } from "@repo/auth/server";
import { and, db, eq } from "@repo/database";
import {
  type IntegrationInstallation,
  integration,
  integrationInstallation,
  member,
} from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type AuthorizedInstallation = {
  row: IntegrationInstallation;
  integrationSlug: string;
  membership: { role: string };
};

export async function loadAuthorizedInstallation(
  installationId: string,
  options: { requireWriteRole?: boolean } = {},
): Promise<AuthorizedInstallation | { error: NextResponse }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const [row] = await db()
    .select({
      installation: integrationInstallation,
      slug: integration.slug,
    })
    .from(integrationInstallation)
    .innerJoin(
      integration,
      eq(integrationInstallation.integrationId, integration.id),
    )
    .where(eq(integrationInstallation.id, installationId))
    .limit(1);
  if (!row) {
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
        eq(member.organizationId, row.installation.organizationId),
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
        { error: "Only workspace owners and admins can modify installations." },
        { status: 403 },
      ),
    };
  }
  return {
    row: row.installation,
    integrationSlug: row.slug,
    membership: { role: m.role },
  };
}
