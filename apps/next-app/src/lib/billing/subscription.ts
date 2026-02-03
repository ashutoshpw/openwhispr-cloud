import { db, sql } from "@repo/database";
import { organization } from "@repo/database/schema";
import { eq } from "@repo/database";
import { STRIPE_SCHEMA } from "./constants";
import type { PlanInfo, StripeSubscription, SubscriptionStatus } from "./types";

/**
 * Check if the stripe schema tables exist
 */
async function stripeTablesExist(): Promise<boolean> {
  try {
    const result = await db().execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = ${STRIPE_SCHEMA} AND table_name = 'subscriptions'
      )`,
    );
    return (result[0]?.exists as boolean) || false;
  } catch {
    return false;
  }
}

/**
 * Get active subscription for a Stripe customer ID
 */
export async function getActiveSubscription(
  customerId: string,
): Promise<StripeSubscription | null> {
  if (!customerId) return null;

  const hasStripe = await stripeTablesExist();
  if (!hasStripe) {
    console.warn("Stripe tables do not exist in database");
    return null;
  }

  try {
    const result = await db().execute(
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.subscriptions`))
        .append(
          sql` WHERE customer = ${customerId} AND status IN ('active', 'trialing') ORDER BY created DESC LIMIT 1`,
        ),
    );

    if (!result[0]) return null;

    return result[0] as unknown as StripeSubscription;
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }
}

/**
 * Get subscription with product details for a customer
 */
export async function getSubscriptionWithProduct(
  customerId: string,
): Promise<PlanInfo | null> {
  if (!customerId) return null;

  const subscription = await getActiveSubscription(customerId);
  if (!subscription) return null;

  try {
    // Get the first subscription item's price
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (!priceId) return null;

    // Query price details from stripe schema
    const priceResult = await db().execute(
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.prices`))
        .append(sql` WHERE id = ${priceId} LIMIT 1`),
    );

    const price = priceResult[0] as {
      id: string;
      product: string;
      unit_amount: number;
      currency: string;
      recurring?: { interval?: string };
    } | null;

    if (!price) return null;

    // Query product details
    const productResult = await db().execute(
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.products`))
        .append(sql` WHERE id = ${price.product} LIMIT 1`),
    );

    const product = productResult[0] as {
      id: string;
      name: string;
    } | null;

    if (!product) return null;

    return {
      productId: product.id,
      productName: product.name,
      priceId: price.id,
      interval: (price.recurring?.interval as "month" | "year") || "month",
      amount: price.unit_amount / 100,
      currency: price.currency,
      status: subscription.status as SubscriptionStatus,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (error) {
    console.error("Error fetching subscription with product:", error);
    return null;
  }
}

/**
 * Check if a customer has an active subscription
 */
export async function isSubscriptionActive(
  customerId: string,
): Promise<boolean> {
  const subscription = await getActiveSubscription(customerId);
  return subscription !== null;
}

/**
 * Get trial end date for a customer
 */
export async function getTrialEndDate(
  customerId: string,
): Promise<Date | null> {
  const subscription = await getActiveSubscription(customerId);
  if (!subscription || subscription.status !== "trialing") return null;
  if (!subscription.trial_end) return null;
  return new Date(subscription.trial_end * 1000);
}

/**
 * Check if subscription is in trial
 */
export async function isInTrial(customerId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(customerId);
  return subscription?.status === "trialing";
}

/**
 * Get organization by ID with stripe customer
 */
export async function getOrganizationWithBilling(orgId: string) {
  const result = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  return result[0] || null;
}

/**
 * Get all subscriptions for a customer (including inactive)
 */
export async function getAllSubscriptions(
  customerId: string,
): Promise<StripeSubscription[]> {
  if (!customerId) return [];

  const hasStripe = await stripeTablesExist();
  if (!hasStripe) return [];

  try {
    const result = await db().execute(
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.subscriptions`))
        .append(sql` WHERE customer = ${customerId} ORDER BY created DESC`),
    );

    return result as unknown as StripeSubscription[];
  } catch (error) {
    console.error("Error fetching all subscriptions:", error);
    return [];
  }
}
