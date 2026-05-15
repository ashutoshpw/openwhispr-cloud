import { and, count, db, desc, eq, isNull, sql } from "@repo/database";
import {
  type Referral,
  type ReferralCode,
  type ReferralIntent,
  organization,
  referralCodes,
  referralIntents,
  referralLifecycleLog,
  referrals,
} from "@repo/database/schema";

// ============================================================================
// Status constants
// ============================================================================

export const REFERRAL_STATUS = {
  PENDING: "pending",
  TRIAL: "trial",
  REFUND_PERIOD: "refund_period",
  CONVERTED: "converted",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type ReferralStatus =
  (typeof REFERRAL_STATUS)[keyof typeof REFERRAL_STATUS];

export const GRANT_STATUS = {
  PENDING: "pending",
  APPLYING: "applying",
  APPLIED: "applied",
  FAILED: "failed",
  REJECTED: "rejected",
} as const;

export type GrantStatus = (typeof GRANT_STATUS)[keyof typeof GRANT_STATUS];

// ============================================================================
// Code generation + lookup
// ============================================================================

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
const CODE_LENGTH = 8;

export function generateReferralCodeString(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function nano(): Promise<string> {
  const { nanoid } = await import("nanoid");
  return nanoid();
}

export async function getReferralCodeByCode(
  code: string,
): Promise<ReferralCode | null> {
  const rows = await db()
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.code, code))
    .limit(1);
  return rows[0] ?? null;
}

export async function getReferralCodeForUser(
  userId: string,
): Promise<ReferralCode | null> {
  const rows = await db()
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrCreateReferralCode(
  userId: string,
): Promise<ReferralCode> {
  const existing = await getReferralCodeForUser(userId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCodeString();
    try {
      const inserted = await db()
        .insert(referralCodes)
        .values({ id: await nano(), userId, code })
        .onConflictDoNothing({ target: referralCodes.userId })
        .returning();
      if (inserted[0]) return inserted[0];
      const re = await getReferralCodeForUser(userId);
      if (re) return re;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new Error("Failed to generate referral code after 5 attempts");
}

// ============================================================================
// Intents — staging row created when /r/[code] is visited
// ============================================================================

export async function captureReferralIntent(opts: {
  code: string;
  expiresInDays?: number;
}): Promise<ReferralIntent | null> {
  const referralCode = await getReferralCodeByCode(opts.code);
  if (!referralCode || !referralCode.isActive) return null;

  const expiresAt = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const inserted = await db()
    .insert(referralIntents)
    .values({
      id: await nano(),
      referralCode: referralCode.code,
      referrerId: referralCode.userId,
      expiresAt,
    })
    .returning();
  return inserted[0] ?? null;
}

// ============================================================================
// Lifecycle — referrals + lifecycle_log entries
// ============================================================================

export interface CreateReferralOpts {
  codeId: string;
  referrerId: string;
  refereeId: string;
  refereeOrgId?: string | null;
}

export async function createReferral(
  opts: CreateReferralOpts,
): Promise<Referral> {
  if (opts.referrerId === opts.refereeId) {
    throw new Error("self_referral_not_allowed");
  }
  const id = await nano();
  const inserted = await db()
    .insert(referrals)
    .values({
      id,
      referralCodeId: opts.codeId,
      referrerId: opts.referrerId,
      refereeId: opts.refereeId,
      refereeOrganizationId: opts.refereeOrgId ?? null,
      status: REFERRAL_STATUS.PENDING,
    })
    .onConflictDoNothing({ target: referrals.refereeId })
    .returning();

  if (!inserted[0]) {
    const existing = await db()
      .select()
      .from(referrals)
      .where(eq(referrals.refereeId, opts.refereeId))
      .limit(1);
    if (existing[0]) return existing[0];
    throw new Error("referral_create_failed");
  }

  await logLifecycle({
    referralId: id,
    fromStatus: null,
    toStatus: REFERRAL_STATUS.PENDING,
    reason: "referral_created",
  });

  await db()
    .update(referralCodes)
    .set({ usageCount: sql`${referralCodes.usageCount} + 1` })
    .where(eq(referralCodes.id, opts.codeId));

  return inserted[0];
}

export async function setRefereeOrganization(
  refereeUserId: string,
  orgId: string,
): Promise<void> {
  await db()
    .update(referrals)
    .set({ refereeOrganizationId: orgId })
    .where(
      and(
        eq(referrals.refereeId, refereeUserId),
        isNull(referrals.refereeOrganizationId),
      ),
    );
}

export async function transitionReferralStatus(opts: {
  referralId: string;
  fromStatus: ReferralStatus | ReferralStatus[];
  toStatus: ReferralStatus;
  reason?: string;
  stripeEventId?: string | null;
  metadata?: Record<string, unknown> | null;
  setConvertedAt?: boolean;
}): Promise<Referral | null> {
  const fromList = Array.isArray(opts.fromStatus)
    ? opts.fromStatus
    : [opts.fromStatus];

  const updated = await db()
    .update(referrals)
    .set({
      status: opts.toStatus,
      ...(opts.setConvertedAt ? { convertedAt: new Date() } : {}),
    })
    .where(
      and(
        eq(referrals.id, opts.referralId),
        sql`${referrals.status} = ANY(${sql.raw(`ARRAY[${fromList.map((s) => `'${s}'`).join(",")}]`)})`,
      ),
    )
    .returning();

  if (!updated[0]) return null;

  await logLifecycle({
    referralId: opts.referralId,
    fromStatus: fromList[0] ?? null,
    toStatus: opts.toStatus,
    reason: opts.reason,
    stripeEventId: opts.stripeEventId ?? null,
    metadata: opts.metadata ?? null,
  });
  return updated[0];
}

export async function markReferralTrial(
  referralId: string,
  stripeEventId?: string,
): Promise<Referral | null> {
  return transitionReferralStatus({
    referralId,
    fromStatus: REFERRAL_STATUS.PENDING,
    toStatus: REFERRAL_STATUS.TRIAL,
    reason: "stripe_webhook",
    stripeEventId,
  });
}

export async function setReferralRefundPeriod(
  referralId: string,
  stripeEventId?: string,
): Promise<Referral | null> {
  return transitionReferralStatus({
    referralId,
    fromStatus: [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.TRIAL],
    toStatus: REFERRAL_STATUS.REFUND_PERIOD,
    reason: "stripe_webhook",
    stripeEventId,
  });
}

export async function activateReferral(
  referralId: string,
  stripeEventId?: string,
): Promise<Referral | null> {
  return transitionReferralStatus({
    referralId,
    fromStatus: [REFERRAL_STATUS.REFUND_PERIOD, REFERRAL_STATUS.TRIAL],
    toStatus: REFERRAL_STATUS.CONVERTED,
    reason: "approval_window_passed",
    stripeEventId,
    setConvertedAt: true,
  });
}

export async function cancelReferral(
  referralId: string,
  reason: string,
  stripeEventId?: string,
): Promise<Referral | null> {
  return transitionReferralStatus({
    referralId,
    fromStatus: [
      REFERRAL_STATUS.PENDING,
      REFERRAL_STATUS.TRIAL,
      REFERRAL_STATUS.REFUND_PERIOD,
    ],
    toStatus: REFERRAL_STATUS.CANCELLED,
    reason,
    stripeEventId,
  });
}

async function logLifecycle(entry: {
  referralId: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string;
  stripeEventId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await db()
    .insert(referralLifecycleLog)
    .values({
      id: await nano(),
      referralId: entry.referralId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason ?? null,
      stripeEventId: entry.stripeEventId ?? null,
      metadata: entry.metadata ?? null,
    });
}

export async function resolveActiveReferralForCustomer(
  customerId: string,
): Promise<Referral | null> {
  const orgs = await db()
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeCustomerId, customerId))
    .limit(1);
  const orgId = orgs[0]?.id;
  if (!orgId) return null;

  const rows = await db()
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.refereeOrganizationId, orgId),
        sql`${referrals.status} NOT IN ('converted', 'cancelled')`,
      ),
    )
    .orderBy(desc(referrals.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// ============================================================================
// Stats
// ============================================================================

export interface ReferralStats {
  totalReferrals: number;
  pendingCount: number;
  trialCount: number;
  refundPeriodCount: number;
  convertedCount: number;
  cancelledCount: number;
  totalCreditsEarnedCents: number;
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const rows = await db()
    .select({ status: referrals.status, n: count() })
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .groupBy(referrals.status);

  const stats: ReferralStats = {
    totalReferrals: 0,
    pendingCount: 0,
    trialCount: 0,
    refundPeriodCount: 0,
    convertedCount: 0,
    cancelledCount: 0,
    totalCreditsEarnedCents: 0,
  };

  for (const row of rows) {
    const n = Number(row.n);
    stats.totalReferrals += n;
    if (row.status === REFERRAL_STATUS.PENDING) stats.pendingCount = n;
    else if (row.status === REFERRAL_STATUS.TRIAL) stats.trialCount = n;
    else if (row.status === REFERRAL_STATUS.REFUND_PERIOD)
      stats.refundPeriodCount = n;
    else if (row.status === REFERRAL_STATUS.CONVERTED) stats.convertedCount = n;
    else if (row.status === REFERRAL_STATUS.CANCELLED) stats.cancelledCount = n;
  }

  const code = await getReferralCodeForUser(userId);
  stats.totalCreditsEarnedCents = code?.totalCreditsEarned ?? 0;
  return stats;
}
