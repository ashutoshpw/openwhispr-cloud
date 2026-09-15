import { withV1Key } from "@/lib/v1-auth";
import { v1Ok } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, desc, eq, gt } from "@repo/database";
import { usagePeriod } from "@repo/database/schema";

/**
 * GET /api/v1/usage — reads the owner's active usage_period row directly
 * (read-only: no period is auto-created here). Personal keys only.
 */
const FREE_WORD_LIMIT = 20_000;

export async function GET(request: Request) {
  return withV1Key(
    request,
    { personalOnly: true, personal: "usage:read" },
    async (auth) => {
      const [row] = await db()
        .select()
        .from(usagePeriod)
        .where(
          and(
            eq(usagePeriod.userId, auth.userId),
            gt(usagePeriod.periodEnd, new Date()),
          ),
        )
        .orderBy(desc(usagePeriod.periodEnd))
        .limit(1);

      const plan =
        row?.plan === "pro" || row?.plan === "business" ? row.plan : "free";
      const limit = row?.wordLimit ?? FREE_WORD_LIMIT;

      return v1Ok({
        words_used: row?.wordsUsed ?? 0,
        words_remaining: Math.max(0, limit - (row?.wordsUsed ?? 0)),
        limit,
        plan,
        is_subscribed: plan !== "free",
        current_period_end: row ? row.periodEnd.toISOString() : null,
        billing_interval: row ? "monthly" : null,
      });
    },
  );
}
