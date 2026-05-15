#!/usr/bin/env tsx
/**
 * Seed a default referral_config row if none exists.
 *
 * Idempotent: safe to run multiple times.
 */

import { colors } from "./lib/colors";

export default async function seedReferrals(): Promise<void> {
  console.log("");
  console.log(`${colors.bold}${colors.cyan}  Referrals Seed${colors.reset}`);
  console.log("");

  const { db, eq } = await import("@repo/database");
  const { referralConfig } = await import("@repo/database/schema");

  const existing = await db()
    .select()
    .from(referralConfig)
    .where(eq(referralConfig.id, "default"))
    .limit(1);

  if (existing.length > 0) {
    console.log(
      `${colors.dim}  · referral_config:${colors.reset} default already exists`,
    );
    console.log("");
    return;
  }

  await db().insert(referralConfig).values({
    id: "default",
    enabled: false,
    referrerCreditAmount: 1000, // $10 in cents
    refereeCreditAmount: 500, // $5 in cents
    currency: "usd",
    minPlanTier: "tier1",
    autoApply: false,
    approvalWindowDays: 30,
  });

  console.log(
    `${colors.green}  + referral_config:${colors.reset} default row inserted`,
  );
  console.log("");
}
