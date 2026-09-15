import { type Stripe, stripe } from "@repo/billing/stripe/client";

/**
 * Session-authenticated billing plane helpers: personal (user-level) Stripe
 * price lookup and customer resolution by account email.
 */

export type BillingTier = "pro" | "business";
export type BillingInterval = "monthly" | "annual";

const PRICE_ENV_KEYS: Record<BillingTier, Record<BillingInterval, string>> = {
  pro: {
    monthly: "STRIPE_PRICE_PRO_MONTHLY",
    annual: "STRIPE_PRICE_PRO_ANNUAL",
  },
  business: {
    monthly: "STRIPE_PRICE_BUSINESS_MONTHLY",
    annual: "STRIPE_PRICE_BUSINESS_ANNUAL",
  },
};

export function priceIdFor(
  tier: BillingTier,
  interval: BillingInterval,
): string | null {
  return process.env[PRICE_ENV_KEYS[tier][interval]] || null;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function billingAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function findStripeCustomerByEmail(
  email: string,
): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  return customers.data[0] ?? null;
}

export function intervalLabel(
  interval: string | undefined,
): "monthly" | "annual" {
  return interval === "year" ? "annual" : "monthly";
}
