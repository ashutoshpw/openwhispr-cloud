import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";
import { getReferralCodeForUser } from "@repo/billing";
import { db } from "@repo/database";
import { desc, eq } from "@repo/database";
import { referrals } from "@repo/database/schema";

/**
 * GET /api/referrals/stats — the session user's referral code plus the
 * per-referral status history.
 */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const code = await getReferralCodeForUser(user.id);

    const rows = code
      ? await db()
          .select({ status: referrals.status, createdAt: referrals.createdAt })
          .from(referrals)
          .where(eq(referrals.referrerId, user.id))
          .orderBy(desc(referrals.createdAt))
      : [];

    return syncOk({
      code: code?.code ?? null,
      usage_count: code?.usageCount ?? 0,
      total_credits_earned: code?.totalCreditsEarned ?? 0,
      referrals: rows.map((row) => ({
        status: row.status,
        created_at: row.createdAt.toISOString(),
      })),
    });
  });
}
