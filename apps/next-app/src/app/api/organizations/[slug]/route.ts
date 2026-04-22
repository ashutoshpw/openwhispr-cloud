import { auth } from "@repo/auth/server";
import { and, db, eq, ne } from "@repo/database";
import { member, organization } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/**
 * GET /api/organizations/[slug]
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;

  const [org] = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [membership] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, org.id),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(org);
}

/**
 * PUT /api/organizations/[slug]
 * Update workspace name and/or slug. Only owners and admins.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug: currentSlug } = await params;

  const [org] = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, currentSlug))
    .limit(1);
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [membership] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, org.id),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json(
      { error: "Only workspace owners and admins can edit settings." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { name, slug } = body as { name?: unknown; slug?: unknown };

  const update: Partial<typeof org> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 },
      );
    }
    update.name = name.trim();
  }

  if (slug !== undefined) {
    if (typeof slug !== "string" || !SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        {
          error:
            "Slug must be 1–50 characters: lowercase letters, numbers, dashes.",
        },
        { status: 400 },
      );
    }
    if (slug !== org.slug) {
      const [conflict] = await db()
        .select({ id: organization.id })
        .from(organization)
        .where(and(eq(organization.slug, slug), ne(organization.id, org.id)))
        .limit(1);
      if (conflict) {
        return NextResponse.json(
          { error: "A workspace with this slug already exists." },
          { status: 409 },
        );
      }
      update.slug = slug;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const [updated] = await db()
    .update(organization)
    .set(update)
    .where(eq(organization.id, org.id))
    .returning();

  return NextResponse.json(updated);
}
