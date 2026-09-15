import { db } from "@repo/database";
import { and, desc, eq, gt, sql } from "@repo/database";
import { usagePeriod } from "@repo/database/schema";

/**
 * Word-usage accounting for the media/AI plane.
 *
 * One row per billing period in `usage_period`; the active period is the row
 * whose `period_end` is still in the future. When none exists (first use or
 * expired period) a free 30-day period is auto-created.
 */

const FREE_WORD_LIMIT = 20_000;
const FREE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export interface UsageSnapshot {
  wordsUsed: number;
  wordsRemaining: number;
  limit: number;
  plan: string;
  status: "active";
  isSubscribed: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  currentPeriodEnd: string;
  billingInterval: "monthly";
  resetAt: string | null;
  entitlementSources: { personal: null; workspaceIds: string[] };
}

/** Whitespace-split word count used for all word accounting. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Returns the active period, auto-creating a free 30-day period when needed. */
export async function ensureActivePeriod(userId: string) {
  const now = new Date();
  const [existing] = await db()
    .select()
    .from(usagePeriod)
    .where(and(eq(usagePeriod.userId, userId), gt(usagePeriod.periodEnd, now)))
    .orderBy(desc(usagePeriod.periodEnd))
    .limit(1);
  if (existing) return existing;

  const [created] = await db()
    .insert(usagePeriod)
    .values({
      id: crypto.randomUUID(),
      userId,
      periodStart: now,
      periodEnd: new Date(now.getTime() + FREE_PERIOD_MS),
      wordsUsed: 0,
      wordLimit: FREE_WORD_LIMIT,
      plan: "free",
    })
    .returning();
  return created;
}

export async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const period = await ensureActivePeriod(userId);
  const wordsRemaining = Math.max(0, period.wordLimit - period.wordsUsed);
  return {
    wordsUsed: period.wordsUsed,
    wordsRemaining,
    limit: period.wordLimit,
    plan: period.plan,
    status: "active",
    isSubscribed: period.plan !== "free",
    isTrial: false,
    trialDaysLeft: 0,
    currentPeriodEnd: period.periodEnd.toISOString(),
    billingInterval: "monthly",
    resetAt: period.resetAt ? period.resetAt.toISOString() : null,
    entitlementSources: { personal: null, workspaceIds: [] },
  };
}

export async function recordWordUsage(
  userId: string,
  words: number,
): Promise<void> {
  const period = await ensureActivePeriod(userId);
  if (words <= 0) return;
  await db()
    .update(usagePeriod)
    .set({ wordsUsed: sql`${usagePeriod.wordsUsed} + ${words}` })
    .where(eq(usagePeriod.id, period.id));
}

export function limitReached(snapshot: UsageSnapshot): boolean {
  return snapshot.wordsRemaining <= 0;
}
