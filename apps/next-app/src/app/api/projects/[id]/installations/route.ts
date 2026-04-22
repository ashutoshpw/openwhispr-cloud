import { createInstallation } from "@/lib/integrations/install";
import { toSafeInstallation } from "@/lib/integrations/types";
import { auth } from "@repo/auth/server";
import { and, db, eq } from "@repo/database";
import {
  integration,
  integrationInstallation,
  member,
  project,
} from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function checkProjectMembership(projectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const [proj] = await db()
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  if (!proj) {
    return {
      error: NextResponse.json({ error: "Project not found" }, { status: 404 }),
    };
  }
  const [m] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, proj.organizationId),
      ),
    )
    .limit(1);
  if (!m) {
    return {
      error: NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 },
      ),
    };
  }
  return { project: proj };
}

/**
 * GET /api/projects/[id]/installations
 * List integrations installed at this project (does not include workspace-scoped).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const check = await checkProjectMembership(id);
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
    .where(eq(integrationInstallation.projectId, id));

  return NextResponse.json(
    rows.map((r) => ({
      ...toSafeInstallation(r.installation),
      integration: r.integration,
    })),
  );
}

/**
 * POST /api/projects/[id]/installations
 * Body: { integrationSlug, displayName?, config }
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const check = await checkProjectMembership(id);
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
    organizationId: check.project.organizationId,
    projectId: id,
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
