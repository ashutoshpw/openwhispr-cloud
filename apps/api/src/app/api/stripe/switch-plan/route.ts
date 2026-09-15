import { withSession } from "@/lib/session";
import {
  findStripeCustomerByEmail,
  isStripeConfigured,
  priceIdFor,
} from "@/lib/stripe-billing";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { getActiveSubscription } from "@repo/billing";
import { stripe } from "@repo/billing/stripe/client";
import { z } from "zod";

const switchPlanRequest = z.object({
  plan: z.enum(["monthly", "annual"]),
  tier: z.enum(["pro", "business"]),
});

/**
 * POST /api/stripe/switch-plan — moves the active subscription to another
 * price with prorations. 501 when there is no subscription to switch.
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = switchPlanRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid plan payload");
    const { plan, tier } = parsed.data;

    const priceId = priceIdFor(tier, plan);
    if (!isStripeConfigured() || !priceId) {
      return syncError(503, "Billing is not configured");
    }

    try {
      const customer = await findStripeCustomerByEmail(user.email);
      const subscription = customer
        ? await getActiveSubscription(customer.id)
        : null;
      const item = subscription?.items?.data?.[0];
      if (!customer || !subscription || !item) {
        return syncError(501, "No active subscription");
      }

      if (item.price?.id === priceId) {
        return syncOk({ alreadyOnPlan: true });
      }

      await stripe.subscriptions.update(subscription.id, {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: "create_prorations",
      });
      return syncOk({});
    } catch (error) {
      console.error("[billing] switch-plan failed", error);
      return syncError(500, "Failed to switch plan");
    }
  });
}
