import { withSession } from "@/lib/session";
import {
  billingAppUrl,
  findStripeCustomerByEmail,
  isStripeConfigured,
} from "@/lib/stripe-billing";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { createPortalSession } from "@repo/billing/stripe/portal";

/**
 * POST /api/stripe/portal — billing portal session for the session user's
 * Stripe customer (resolved by account email). 404 without a profile.
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    if (!isStripeConfigured()) {
      return syncError(503, "Billing is not configured");
    }

    try {
      const customer = await findStripeCustomerByEmail(user.email);
      if (!customer) {
        return syncError(404, "No billing profile");
      }

      const portal = await createPortalSession({
        customerId: customer.id,
        returnUrl: `${billingAppUrl()}/account/billing`,
      });
      return syncOk({ url: portal.portalUrl });
    } catch (error) {
      console.error("[billing] portal failed", error);
      return syncError(500, "Failed to create billing portal session");
    }
  });
}
