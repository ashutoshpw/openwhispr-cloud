import { stripe } from "./client";
import { db } from "@repo/database";
import { organization } from "@repo/database/schema";
import { eq } from "@repo/database";

/**
 * Create a new Stripe customer
 */
export async function createStripeCustomer(params: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });

  return customer.id;
}

/**
 * Get or create a Stripe customer for an organization
 * If the organization already has a stripe_customer_id, return it
 * Otherwise, create a new customer and update the organization
 */
export async function getOrCreateStripeCustomer(params: {
  orgId: string;
  email: string;
  orgName: string;
}): Promise<string> {
  // Check if organization already has a customer
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, params.orgId))
    .limit(1);

  if (org[0]?.stripeCustomerId) {
    return org[0].stripeCustomerId;
  }

  // Create new customer
  const customerId = await createStripeCustomer({
    email: params.email,
    name: params.orgName,
    metadata: {
      organizationId: params.orgId,
      organizationName: params.orgName,
    },
  });

  // Update organization with customer ID
  await db()
    .update(organization)
    .set({ stripeCustomerId: customerId })
    .where(eq(organization.id, params.orgId));

  return customerId;
}

/**
 * Get a Stripe customer by ID
 */
export async function getStripeCustomer(
  customerId: string,
): Promise<import("stripe").Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer as import("stripe").Stripe.Customer;
  } catch {
    return null;
  }
}

/**
 * Update a Stripe customer's metadata
 */
export async function updateStripeCustomerMetadata(
  customerId: string,
  metadata: Record<string, string>,
): Promise<void> {
  await stripe.customers.update(customerId, { metadata });
}

/**
 * Delete a Stripe customer
 * Note: This will also delete all associated subscriptions
 */
export async function deleteStripeCustomer(customerId: string): Promise<void> {
  await stripe.customers.del(customerId);
}

/**
 * Get a customer's payment methods
 */
export async function getCustomerPaymentMethods(customerId: string) {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  return paymentMethods.data;
}

/**
 * Check if customer has at least one payment method
 */
export async function customerHasPaymentMethod(
  customerId: string,
): Promise<boolean> {
  const paymentMethods = await getCustomerPaymentMethods(customerId);
  return paymentMethods.length > 0;
}
