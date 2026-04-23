import { isSiteAdmin } from "@/lib/auth-utils";
import { agent, db } from "@repo/database";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function GET() {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await db().select().from(agent);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const {
    slug,
    name,
    description,
    category,
    iconUrl,
    docsUrl,
    status,
    isSystemManaged,
    systemPrompt,
    model,
    temperature,
    configSchema,
    metadata,
  } = body as Record<string, unknown>;

  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase alphanumeric with dashes" },
      { status: 400 },
    );
  }
  if (typeof name !== "string" || !name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof category !== "string" || !category) {
    return NextResponse.json(
      { error: "category is required" },
      { status: 400 },
    );
  }

  try {
    const [row] = await db()
      .insert(agent)
      .values({
        id: nanoid(),
        slug,
        name,
        description: typeof description === "string" ? description : null,
        category,
        iconUrl: typeof iconUrl === "string" ? iconUrl : null,
        docsUrl: typeof docsUrl === "string" ? docsUrl : null,
        status:
          status === "beta" ||
          status === "deprecated" ||
          status === "hidden" ||
          status === "active"
            ? status
            : "active",
        isSystemManaged: Boolean(isSystemManaged),
        systemPrompt: typeof systemPrompt === "string" ? systemPrompt : null,
        model: typeof model === "string" && model ? model : null,
        temperature:
          typeof temperature === "number"
            ? String(temperature)
            : typeof temperature === "string" && temperature
              ? temperature
              : null,
        configSchema: configSchema ?? null,
        metadata: metadata ?? null,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
