import { withSession } from "@/lib/session";
import { syncCreated, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { member, organization } from "@repo/database/schema";
import { z } from "zod";

const createRequest = z.object({ name: z.string().min(1).max(100) });
const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** GET /api/workspaces → workspaces the caller belongs to. */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const rows = await db()
      .select({ org: organization, role: member.role })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, user.id));

    return syncOk({
      workspaces: rows.map((r) => ({
        id: r.org.id,
        name: r.org.name,
        slug: r.org.slug,
        logo: r.org.logo,
        status: r.org.status,
        role: r.role,
        created_at: r.org.createdAt.toISOString(),
        updated_at: r.org.updatedAt.toISOString(),
      })),
    });
  });
}

/** POST /api/workspaces { name } — creates the org with caller as owner. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = createRequest.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: { message: "name is required" } },
        { status: 400 },
      );
    }

    const now = new Date();
    const orgId = crypto.randomUUID();
    const slug = `${slugify(parsed.data.name)}-${orgId.slice(0, 6)}`;

    const [org] = await db()
      .insert(organization)
      .values({ id: orgId, name: parsed.data.name, slug, status: "active" })
      .returning();
    await db().insert(member).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: user.id,
      role: "owner",
    });

    void now;
    return syncCreated({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      status: org.status,
      created_at: org.createdAt.toISOString(),
      updated_at: org.updatedAt.toISOString(),
    });
  });
}
