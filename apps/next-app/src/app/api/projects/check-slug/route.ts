import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { member, project } from "@repo/database/schema";
import { and, eq } from "@repo/database";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/projects/check-slug?slug=xxx&organizationId=xxx
 * Check if a project slug is available within an organization
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const organizationId = searchParams.get("organizationId");

    if (!slug || !organizationId) {
      return NextResponse.json(
        { error: "slug and organizationId are required" },
        { status: 400 },
      );
    }

    // Verify user is a member of the organization
    const memberRecord = await db()
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (memberRecord.length === 0) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 },
      );
    }

    // Check if slug exists
    const existingProject = await db()
      .select()
      .from(project)
      .where(
        and(eq(project.organizationId, organizationId), eq(project.slug, slug)),
      )
      .limit(1);

    return NextResponse.json({
      available: existingProject.length === 0,
    });
  } catch (error) {
    console.error("Error checking project slug:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
