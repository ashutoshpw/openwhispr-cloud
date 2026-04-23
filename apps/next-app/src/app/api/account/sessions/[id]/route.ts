import { auth } from "@repo/auth/server";
import { and, db, eq } from "@repo/database";
import { session } from "@repo/database/schema";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const reqHeaders = await headers();
  const result = await auth.api.getSession({ headers: reqHeaders });
  if (!result?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Special token "all-others" revokes every session except the current one
  if (id === "all-others") {
    const cookieHeader = reqHeaders.get("cookie") ?? "";
    const userSessions = await db()
      .select({ id: session.id, token: session.token })
      .from(session)
      .where(eq(session.userId, result.user.id));

    const idsToRevoke = userSessions
      .filter((s) => !s.token || !cookieHeader.includes(s.token))
      .map((s) => s.id);

    for (const sid of idsToRevoke) {
      await db().delete(session).where(eq(session.id, sid));
    }
    return NextResponse.json({ revoked: idsToRevoke.length });
  }

  // Refuse to delete the current session through this endpoint
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const [target] = await db()
    .select()
    .from(session)
    .where(and(eq(session.id, id), eq(session.userId, result.user.id)))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (target.token && cookieHeader.includes(target.token)) {
    return NextResponse.json(
      { error: "cannot_revoke_current_session" },
      { status: 400 },
    );
  }

  await db()
    .delete(session)
    .where(and(eq(session.id, id), eq(session.userId, result.user.id)));

  return NextResponse.json({ ok: true });
}
