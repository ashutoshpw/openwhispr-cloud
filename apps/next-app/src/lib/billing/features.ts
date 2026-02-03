import { db } from "@repo/database";
import { and, eq, gt, isNull, or } from "@repo/database";
import {
  appSettings,
  orgFeatures,
  organization,
  pricingTierFeatures,
} from "@repo/database/schema";
import { FEATURE_KEYS, FREE_TIER_FEATURES, STRIPE_SCHEMA } from "./constants";
import { getSubscriptionWithProduct } from "./subscription";
import type { FeatureMap } from "./types";

/**
 * Get features for a pricing tier (Stripe product)
 */
export async function getTierFeatures(productId: string): Promise<FeatureMap> {
  const features = await db()
    .select()
    .from(pricingTierFeatures)
    .where(eq(pricingTierFeatures.productId, productId));

  const featureMap: FeatureMap = {};
  for (const feature of features) {
    featureMap[feature.featureKey] = parseFeatureValue(feature.featureValue);
  }

  return featureMap;
}

/**
 * Get organization-specific feature overrides
 */
export async function getOrgFeatureOverrides(
  orgId: string,
): Promise<FeatureMap> {
  const now = new Date();
  const features = await db()
    .select()
    .from(orgFeatures)
    .where(
      and(
        eq(orgFeatures.organizationId, orgId),
        // Only get non-expired features
        or(isNull(orgFeatures.expiresAt), gt(orgFeatures.expiresAt, now)),
      ),
    );

  const featureMap: FeatureMap = {};
  for (const feature of features) {
    featureMap[feature.featureKey] = parseFeatureValue(feature.featureValue);
  }

  return featureMap;
}

/**
 * Get all features for an organization
 * Combines: free tier defaults -> tier features -> org overrides
 */
export async function getOrganizationFeatures(
  orgId: string,
): Promise<FeatureMap> {
  // Start with free tier defaults
  let features: FeatureMap = { ...FREE_TIER_FEATURES };

  // Get organization to check for subscription
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (org[0]?.stripeCustomerId) {
    // Get subscription and tier features
    const plan = await getSubscriptionWithProduct(org[0].stripeCustomerId);
    if (plan) {
      const tierFeatures = await getTierFeatures(plan.productId);
      features = { ...features, ...tierFeatures };
    }
  }

  // Apply org-specific overrides
  const overrides = await getOrgFeatureOverrides(orgId);
  features = { ...features, ...overrides };

  return features;
}

/**
 * Check if organization has a specific feature enabled
 */
export async function hasFeature(
  orgId: string,
  featureKey: string,
): Promise<boolean> {
  const features = await getOrganizationFeatures(orgId);
  const value = features[featureKey];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    return value === "true" || value === "unlimited" || value !== "0";
  }

  return false;
}

/**
 * Get numeric feature limit for an organization
 * Returns null if feature is not a numeric limit
 */
export async function getFeatureLimit(
  orgId: string,
  featureKey: string,
): Promise<number | "unlimited" | null> {
  const features = await getOrganizationFeatures(orgId);
  const value = features[featureKey];

  if (value === "unlimited" || value === -1) {
    return "unlimited";
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "unlimited") return "unlimited";
    const num = Number.parseInt(value, 10);
    if (!Number.isNaN(num)) return num;
  }

  return null;
}

/**
 * Check if organization can perform an action based on a feature limit
 */
export async function checkFeatureLimitAccess(
  orgId: string,
  featureKey: string,
  currentCount: number,
): Promise<boolean> {
  const limit = await getFeatureLimit(orgId, featureKey);

  if (limit === null) {
    return false;
  }

  if (limit === "unlimited") {
    return true;
  }

  return currentCount < limit;
}

/**
 * Parse feature value from string to appropriate type
 */
function parseFeatureValue(value: string): string | number | boolean {
  // Boolean values
  if (value === "true") return true;
  if (value === "false") return false;

  // Unlimited
  if (value === "unlimited") return "unlimited";

  // Numeric values
  const num = Number.parseInt(value, 10);
  if (!Number.isNaN(num) && num.toString() === value) {
    return num;
  }

  // Default to string
  return value;
}

/**
 * Add a feature override for an organization
 */
export async function addOrgFeatureOverride(params: {
  orgId: string;
  featureKey: string;
  featureValue: string;
  reason?: string;
  grantedBy?: string;
  expiresAt?: Date;
}): Promise<void> {
  const { nanoid } = await import("nanoid");

  await db()
    .insert(orgFeatures)
    .values({
      id: nanoid(),
      organizationId: params.orgId,
      featureKey: params.featureKey,
      featureValue: params.featureValue,
      reason: params.reason,
      grantedBy: params.grantedBy,
      expiresAt: params.expiresAt,
    })
    .onConflictDoUpdate({
      target: [orgFeatures.organizationId, orgFeatures.featureKey],
      set: {
        featureValue: params.featureValue,
        reason: params.reason,
        grantedBy: params.grantedBy,
        expiresAt: params.expiresAt,
      },
    });
}

/**
 * Remove a feature override for an organization
 */
export async function removeOrgFeatureOverride(
  orgId: string,
  featureKey: string,
): Promise<void> {
  await db()
    .delete(orgFeatures)
    .where(
      and(
        eq(orgFeatures.organizationId, orgId),
        eq(orgFeatures.featureKey, featureKey),
      ),
    );
}

/**
 * Set a pricing tier feature
 */
export async function setTierFeature(params: {
  productId: string;
  featureKey: string;
  featureValue: string;
}): Promise<void> {
  const { nanoid } = await import("nanoid");

  await db()
    .insert(pricingTierFeatures)
    .values({
      id: nanoid(),
      productId: params.productId,
      featureKey: params.featureKey,
      featureValue: params.featureValue,
    })
    .onConflictDoUpdate({
      target: [pricingTierFeatures.productId, pricingTierFeatures.featureKey],
      set: {
        featureValue: params.featureValue,
      },
    });
}

/**
 * Remove a pricing tier feature
 */
export async function removeTierFeature(
  productId: string,
  featureKey: string,
): Promise<void> {
  await db()
    .delete(pricingTierFeatures)
    .where(
      and(
        eq(pricingTierFeatures.productId, productId),
        eq(pricingTierFeatures.featureKey, featureKey),
      ),
    );
}

/**
 * Get an app setting value
 */
export async function getAppSetting(key: string): Promise<string | null> {
  const result = await db()
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);

  return result[0]?.value ?? null;
}

/**
 * Set an app setting value
 */
export async function setAppSetting(
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  const { nanoid } = await import("nanoid");

  await db()
    .insert(appSettings)
    .values({
      id: nanoid(),
      key,
      value,
      description,
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value,
        description,
      },
    });
}
