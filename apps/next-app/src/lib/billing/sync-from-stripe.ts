import "server-only";

import { db, eq } from "@repo/database";
import { orgBilling } from "@repo/database/schema";
import type Stripe from "stripe";

import { getOrgBilling } from "./get-org-billing";

/**
 * Map Stripe subscription status into the local org_billing.planStatus value.
 * Local statuses: active | trialing | past_due | canceled | incomplete | paused
 */
function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "paused":
      return status;
    case "incomplete_expired":
      return "canceled";
    case "unpaid":
      return "past_due";
    default:
      return "incomplete";
  }
}

/**
 * Upsert org_billing fields from a Stripe subscription event.
 * - Always updates lifecycle/Stripe linkage fields.
 * - Only auto-promotes planTier from "free" -> "tier1" when manualOverride is false.
 *   Admins keep full control via the admin UI; manual overrides are never clobbered.
 */
export async function syncOrgBillingFromSubscription(
  organizationId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const current = await getOrgBilling(organizationId);
  if (current.manualOverride) {
    // Still update lifecycle fields, but never the tier
    await db()
      .update(orgBilling)
      .set({
        planStatus: mapStripeStatus(subscription.status),
        stripeSubscriptionId: subscription.id,
        stripeProductId:
          (subscription.items.data[0]?.price?.product as string) ?? null,
        stripePriceId: subscription.items.data[0]?.price?.id ?? null,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      })
      .where(eq(orgBilling.organizationId, organizationId));
    return;
  }

  const nextTier =
    current.planTier === "free" && subscription.status !== "canceled"
      ? "tier1"
      : current.planTier;

  await db()
    .update(orgBilling)
    .set({
      planTier: nextTier,
      planStatus: mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscription.id,
      stripeProductId:
        (subscription.items.data[0]?.price?.product as string) ?? null,
      stripePriceId: subscription.items.data[0]?.price?.id ?? null,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    })
    .where(eq(orgBilling.organizationId, organizationId));
}

/**
 * Mark org as canceled when a subscription is fully deleted.
 * Demotes to "free" only when not under a manual override.
 */
export async function syncOrgBillingOnSubscriptionDeleted(
  organizationId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const current = await getOrgBilling(organizationId);

  await db()
    .update(orgBilling)
    .set({
      planTier: current.manualOverride ? current.planTier : "free",
      planStatus: "canceled",
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: false,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date(),
    })
    .where(eq(orgBilling.organizationId, organizationId));
}
