import { isSiteAdmin } from "@/lib/auth-utils";
import { agent, db, eq } from "@repo/database";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const [row] = await db()
    .select()
    .from(agent)
    .where(eq(agent.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const allowed = [
    "name",
    "description",
    "category",
    "iconUrl",
    "docsUrl",
    "status",
    "isSystemManaged",
    "systemPrompt",
    "model",
    "temperature",
    "configSchema",
    "metadata",
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      const value = (body as Record<string, unknown>)[key];
      if (key === "temperature" && typeof value === "number") {
        update[key] = String(value);
      } else {
        update[key] = value;
      }
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }
  const [row] = await db()
    .update(agent)
    .set(update)
    .where(eq(agent.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db().delete(agent).where(eq(agent.id, id));
  return NextResponse.json({ success: true });
}
