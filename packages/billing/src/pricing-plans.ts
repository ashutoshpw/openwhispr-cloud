import { asc, db, eq } from "@repo/database";
import { type PlanTier, planTier } from "@repo/database/schema";
import { stripe } from "./stripe/client";

export type PricingPlan = PlanTier;

export interface NewPricingPlan {
  key: string;
  displayName: string;
  description?: string | null;
  isPaid?: boolean;
  sortOrder?: number;
  stripeProductId?: string | null;
  monthlyPriceId?: string | null;
  yearlyPriceId?: string | null;
  monthlyDisplayPrice?: string | null;
  yearlyDisplayPrice?: string | null;
  costLabel?: string | null;
  features?: string[];
  isPopular?: boolean;
  isExclusive?: boolean;
  actionLabel?: string | null;
  hideFromPricing?: boolean;
}

export type UpdatePricingPlanPatch = Partial<Omit<NewPricingPlan, "key">> & {
  key?: string;
};

export interface ValidateStripePriceResult {
  valid: boolean;
  amount?: number; // in major units (dollars), 2 decimals
  currency?: string;
  interval?: "day" | "week" | "month" | "year";
  active?: boolean;
  productId?: string;
  productName?: string;
  error?: string;
}

const PROTECTED_KEYS = new Set(["free"]);

export async function listPricingPlans(): Promise<PricingPlan[]> {
  return db().select().from(planTier).orderBy(asc(planTier.sortOrder));
}

export async function getPricingPlan(id: string): Promise<PricingPlan | null> {
  const rows = await db()
    .select()
    .from(planTier)
    .where(eq(planTier.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPricingPlanByKey(
  key: string,
): Promise<PricingPlan | null> {
  const rows = await db()
    .select()
    .from(planTier)
    .where(eq(planTier.key, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function createPricingPlan(
  data: NewPricingPlan,
): Promise<PricingPlan> {
  const { nanoid } = await import("nanoid");
  const inserted = await db()
    .insert(planTier)
    .values({
      id: nanoid(),
      key: data.key,
      displayName: data.displayName,
      description: data.description ?? null,
      isPaid: data.isPaid ?? false,
      sortOrder: data.sortOrder ?? 0,
      stripeProductId: data.stripeProductId ?? null,
      monthlyPriceId: data.monthlyPriceId ?? null,
      yearlyPriceId: data.yearlyPriceId ?? null,
      monthlyDisplayPrice: data.monthlyDisplayPrice ?? null,
      yearlyDisplayPrice: data.yearlyDisplayPrice ?? null,
      costLabel: data.costLabel ?? null,
      features: data.features ?? [],
      isPopular: data.isPopular ?? false,
      isExclusive: data.isExclusive ?? false,
      actionLabel: data.actionLabel ?? null,
      hideFromPricing: data.hideFromPricing ?? false,
    })
    .returning();

  if (!inserted[0]) {
    throw new Error("Failed to create pricing plan");
  }
  return inserted[0];
}

export async function updatePricingPlan(
  id: string,
  patch: UpdatePricingPlanPatch,
): Promise<PricingPlan> {
  const updated = await db()
    .update(planTier)
    .set(patch)
    .where(eq(planTier.id, id))
    .returning();

  if (!updated[0]) {
    throw new Error(`Pricing plan ${id} not found`);
  }
  return updated[0];
}

export async function deletePricingPlan(id: string): Promise<void> {
  const existing = await getPricingPlan(id);
  if (!existing) {
    throw new Error(`Pricing plan ${id} not found`);
  }
  if (PROTECTED_KEYS.has(existing.key)) {
    throw new Error(`Cannot delete protected pricing plan "${existing.key}"`);
  }
  await db().delete(planTier).where(eq(planTier.id, id));
}

export async function reorderPricingPlans(orderedIds: string[]): Promise<void> {
  // Sequential updates — small N (typically <10 plans) so a transaction is overkill.
  await Promise.all(
    orderedIds.map((id, index) =>
      db()
        .update(planTier)
        .set({ sortOrder: index })
        .where(eq(planTier.id, id)),
    ),
  );
}

/**
 * Live-validate a Stripe price ID by fetching it from the Stripe API.
 * Used by the admin UI on field blur to surface a green/red badge.
 */
export async function validateStripePriceId(
  priceId: string,
): Promise<ValidateStripePriceResult> {
  if (!priceId.trim()) {
    return { valid: false, error: "Price ID is required" };
  }
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });
    const productId =
      typeof price.product === "string" ? price.product : price.product?.id;
    const productName =
      typeof price.product === "object" &&
      price.product &&
      "name" in price.product
        ? (price.product as { name?: string }).name
        : undefined;
    return {
      valid: true,
      amount: price.unit_amount != null ? price.unit_amount / 100 : undefined,
      currency: price.currency,
      interval: price.recurring?.interval,
      active: price.active,
      productId,
      productName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: message };
  }
}
