import { createInstallation } from "@/lib/integrations/install";
import { toSafeInstallation } from "@/lib/integrations/types";
import { auth } from "@repo/auth/server";
import { and, db, eq } from "@repo/database";
import {
  integration,
  integrationInstallation,
  member,
  organization,
} from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function checkOrgMembership(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const [org] = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!org) {
    return {
      error: NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      ),
    };
  }
  const [m] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, org.id),
      ),
    )
    .limit(1);
  if (!m) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { organization: org };
}

/**
 * GET /api/organizations/[slug]/installations
 * List workspace-scoped installations (projectId IS NULL).
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { slug } = await params;
  const check = await checkOrgMembership(slug);
  if ("error" in check) return check.error;

  const rows = await db()
    .select({
      installation: integrationInstallation,
      integration: integration,
    })
    .from(integrationInstallation)
    .innerJoin(
      integration,
      eq(integrationInstallation.integrationId, integration.id),
    )
    .where(
      and(
        eq(integrationInstallation.organizationId, check.organization.id),
        // projectId IS NULL => workspace scope
      ),
    );

  const workspaceOnly = rows.filter((r) => r.installation.projectId === null);

  return NextResponse.json(
    workspaceOnly.map((r) => ({
      ...toSafeInstallation(r.installation),
      integration: r.integration,
    })),
  );
}

/**
 * POST /api/organizations/[slug]/installations
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const check = await checkOrgMembership(slug);
  if ("error" in check) return check.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { integrationSlug, displayName, config } = body as {
    integrationSlug?: string;
    displayName?: string;
    config?: Record<string, unknown>;
  };
  if (!integrationSlug || !config) {
    return NextResponse.json(
      { error: "integrationSlug and config are required" },
      { status: 400 },
    );
  }

  const result = await createInstallation({
    integrationSlug,
    organizationId: check.organization.id,
    projectId: null,
    displayName,
    config,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json(result.installation, { status: 201 });
}
