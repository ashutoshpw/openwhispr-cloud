import { recordUserAudit } from "@/lib/audit/user-audit";
import { auth } from "@repo/auth/server";
import { and, db, eq, inArray } from "@repo/database";
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

  const userId = result.user.id;
  const { id } = await params;
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Special token "all-others" revokes every session except the current one
  if (id === "all-others") {
    const userSessions = await db()
      .select({ id: session.id, token: session.token })
      .from(session)
      .where(eq(session.userId, userId));

    const idsToRevoke = userSessions
      .filter((s) => !s.token || !cookieHeader.includes(s.token))
      .map((s) => s.id);

    if (idsToRevoke.length > 0) {
      await db()
        .delete(session)
        .where(
          and(eq(session.userId, userId), inArray(session.id, idsToRevoke)),
        );
      await recordUserAudit({
        userId,
        action: "session.revoked_others",
        metadata: { revokedCount: idsToRevoke.length },
        headers: reqHeaders,
      });
    }

    return NextResponse.json({ revoked: idsToRevoke.length });
  }

  const [target] = await db()
    .select()
    .from(session)
    .where(and(eq(session.id, id), eq(session.userId, userId)))
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
    .where(and(eq(session.id, id), eq(session.userId, userId)));

  await recordUserAudit({
    userId,
    action: "session.revoked",
    metadata: { sessionId: id },
    headers: reqHeaders,
  });

  return NextResponse.json({ ok: true });
}
