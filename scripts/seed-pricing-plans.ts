#!/usr/bin/env tsx
/**
 * Seed display fields (actionLabel, features, isPopular, isExclusive) for
 * existing plan_tier rows that have no actionLabel set yet.
 *
 * Idempotent: safe to run multiple times.
 */

import { colors } from "./lib/colors";

type PlanDefaults = {
  actionLabel: string;
  features?: string[];
  isPopular?: boolean;
  isExclusive?: boolean;
};

const PLAN_DEFAULTS: Record<string, PlanDefaults> = {
  free: {
    actionLabel: "Get Started Free",
    features: ["Up to 3 projects", "Community support", "Basic analytics"],
  },
  tier1: {
    actionLabel: "Get Started",
    features: [
      "Unlimited projects",
      "Priority support",
      "Advanced analytics",
      "Custom domains",
    ],
    isPopular: true,
  },
  tier2: {
    actionLabel: "Contact Sales",
    features: [
      "Everything in Pro",
      "SSO/SAML",
      "Dedicated support",
      "SLA guarantee",
    ],
    isExclusive: true,
  },
};

export default async function seedPricingPlans(): Promise<void> {
  console.log("");
  console.log(
    `${colors.bold}${colors.cyan}  Pricing Plans Seed${colors.reset}`,
  );
  console.log("");

  const { db, eq, isNull } = await import("@repo/database");
  const { planTier } = await import("@repo/database/schema");

  const rows = await db()
    .select()
    .from(planTier)
    .where(isNull(planTier.actionLabel));

  if (rows.length === 0) {
    console.log(
      `${colors.dim}  · plan_tier:${colors.reset} all rows already have actionLabel set`,
    );
    console.log("");
    return;
  }

  let updated = 0;
  for (const row of rows) {
    const defaults: PlanDefaults = PLAN_DEFAULTS[row.key] ?? {
      actionLabel: "Get Started",
    };

    await db()
      .update(planTier)
      .set({
        actionLabel: defaults.actionLabel,
        ...(defaults.features !== undefined && { features: defaults.features }),
        ...(defaults.isPopular !== undefined && {
          isPopular: defaults.isPopular,
        }),
        ...(defaults.isExclusive !== undefined && {
          isExclusive: defaults.isExclusive,
        }),
      })
      .where(eq(planTier.key, row.key));

    updated++;
    console.log(
      `${colors.green}  + plan_tier:${colors.reset} ${row.key} → "${defaults.actionLabel}"`,
    );
  }

  console.log("");
  console.log(
    `${colors.bold}  Summary:${colors.reset} ${updated} plan_tier row(s) updated`,
  );
  console.log("");
}
