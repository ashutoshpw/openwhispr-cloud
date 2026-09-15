import { withSession } from "@/lib/session";
import {
  billingAppUrl,
  isStripeConfigured,
  priceIdFor,
} from "@/lib/stripe-billing";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { stripe } from "@repo/billing/stripe/client";
import { z } from "zod";

const checkoutRequest = z.object({
  plan: z.enum(["monthly", "annual"]).default("monthly"),
  tier: z.enum(["pro", "business"]).default("pro"),
});

/**
 * POST /api/stripe/checkout — subscription checkout for the session user.
 * Price IDs come from STRIPE_PRICE_{TIER}_{INTERVAL}; 503 when unconfigured.
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = checkoutRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid checkout payload");
    const { plan, tier } = parsed.data;

    const priceId = priceIdFor(tier, plan);
    if (!isStripeConfigured() || !priceId) {
      return syncError(503, "Billing is not configured");
    }

    const metadata = { userId: user.id, tier, plan };
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        success_url: `${billingAppUrl()}/account/billing?success=1`,
        cancel_url: `${billingAppUrl()}/account/billing?canceled=1`,
        metadata,
        subscription_data: { metadata },
      });
      if (!session.url)
        return syncError(500, "Failed to create checkout session");
      return syncOk({ url: session.url });
    } catch (error) {
      console.error("[billing] checkout failed", error);
      return syncError(500, "Failed to create checkout session");
    }
  });
}
