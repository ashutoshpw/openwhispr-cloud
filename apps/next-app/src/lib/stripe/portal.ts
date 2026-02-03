import { db } from "@repo/database";
import { eq } from "@repo/database";
import { organization } from "@repo/database/schema";
import { stripe } from "./client";

/**
 * Get the base URL for the application
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Create a billing portal session for a customer
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl?: string;
}): Promise<{ portalUrl: string }> {
  const baseUrl = getBaseUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl || `${baseUrl}/dashboard`,
  });

  return {
    portalUrl: session.url,
  };
}

/**
 * Create a billing portal session for an organization
 */
export async function createOrganizationPortalSession(params: {
  orgId: string;
  returnUrl?: string;
}): Promise<{ portalUrl: string }> {
  // Get organization
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, params.orgId))
    .limit(1);

  if (!org[0]) {
    throw new Error("Organization not found");
  }

  if (!org[0].stripeCustomerId) {
    throw new Error("Organization does not have a Stripe customer");
  }

  const baseUrl = getBaseUrl();

  return createPortalSession({
    customerId: org[0].stripeCustomerId,
    returnUrl:
      params.returnUrl ||
      `${baseUrl}/dashboard/${org[0].slug}/~/settings/billing`,
  });
}

/**
 * Get portal configuration
 * Note: Portal configuration is managed in Stripe Dashboard
 */
export async function getPortalConfiguration() {
  const configurations = await stripe.billingPortal.configurations.list({
    limit: 1,
    active: true,
  });

  return configurations.data[0] || null;
}
