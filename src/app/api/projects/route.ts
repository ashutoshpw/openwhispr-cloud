import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization, project } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/projects?organizationId=xxx
 * List all projects for a given organization
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
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
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

    const projects = await db()
      .select()
      .from(project)
      .where(eq(project.organizationId, organizationId))
      .orderBy(project.createdAt);

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error listing projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, organizationId } = body;

    if (!name || !slug || !organizationId) {
      return NextResponse.json(
        { error: "name, slug, and organizationId are required" },
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

    // Check if slug is already taken in this organization
    const existingProject = await db()
      .select()
      .from(project)
      .where(
        and(eq(project.organizationId, organizationId), eq(project.slug, slug)),
      )
      .limit(1);

    if (existingProject.length > 0) {
      return NextResponse.json(
        { error: "A project with this slug already exists in this workspace" },
        { status: 409 },
      );
    }

    const [newProject] = await db()
      .insert(project)
      .values({
        id: nanoid(),
        name,
        slug,
        description: description || null,
        organizationId,
        isDefault: false,
      })
      .returning();

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
