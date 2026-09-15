import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { account, member, session, user } from "@repo/database/schema";

/**
 * DELETE /api/auth/delete-account — destroys the caller's account and
 * membership rows. Content rows (notes/transcriptions) cascade from the user
 * row; creator attribution columns are set null by FK policy.
 */
export async function DELETE(request: Request) {
  return withSession(request, async (requested) => {
    await db().delete(member).where(eq(member.userId, requested.id));
    await db().delete(session).where(eq(session.userId, requested.id));
    await db().delete(account).where(eq(account.userId, requested.id));
    await db().delete(user).where(eq(user.id, requested.id));
    return syncOk({ deleted: true });
  });
}
