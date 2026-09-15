import { withSession } from "@/lib/session";
import {
  findStripeCustomerByEmail,
  intervalLabel,
  isStripeConfigured,
  priceIdFor,
} from "@/lib/stripe-billing";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { getActiveSubscription } from "@repo/billing";
import { stripe } from "@repo/billing/stripe/client";
import { z } from "zod";

const previewSwitchRequest = z.object({
  plan: z.enum(["monthly", "annual"]),
  tier: z.enum(["pro", "business"]),
});

/**
 * POST /api/stripe/preview-switch — what a plan switch would cost now and
 * next. Proration amounts stay zero until the Stripe proration preview is
 * wired; price/interval/date facts come from Stripe.
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = previewSwitchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid plan payload");
    const { plan, tier } = parsed.data;

    const priceId = priceIdFor(tier, plan);
    if (!isStripeConfigured() || !priceId) {
      return syncError(503, "Billing is not configured");
    }

    try {
      const target = await stripe.prices.retrieve(priceId);

      const customer = await findStripeCustomerByEmail(user.email);
      const subscription = customer
        ? await getActiveSubscription(customer.id)
        : null;
      const item = subscription?.items?.data?.[0] ?? null;

      const alreadyOnPlan = item?.price?.id === priceId;
      return syncOk({
        immediateAmount: 0,
        currency: target.currency || "usd",
        currentPriceAmount:
          item?.price?.unit_amount != null ? item.price.unit_amount / 100 : 0,
        currentInterval: intervalLabel(item?.price?.recurring?.interval),
        newPriceAmount: (target.unit_amount ?? 0) / 100,
        newInterval: intervalLabel(target.recurring?.interval),
        nextBillingDate: subscription
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        ...(alreadyOnPlan ? { alreadyOnPlan: true } : {}),
      });
    } catch (error) {
      console.error("[billing] preview-switch failed", error);
      return syncError(500, "Failed to preview plan switch");
    }
  });
}
