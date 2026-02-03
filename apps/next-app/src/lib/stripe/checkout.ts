import { ORG_STATUS, TRIAL_DURATION_DAYS } from "@/lib/billing/constants";
import type { CheckoutMetadata, CheckoutResult } from "@/lib/billing/types";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { member, organization, project } from "@repo/database/schema";
import { stripe } from "./client";
import { getOrCreateStripeCustomer } from "./customer";

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
 * Create a checkout session for a new workspace subscription
 * This creates a pending organization and returns a checkout URL
 */
export async function createWorkspaceCheckout(params: {
  priceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userId: string;
  userEmail: string;
  withTrial?: boolean;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CheckoutResult> {
  const { nanoid } = await import("nanoid");
  const baseUrl = getBaseUrl();

  // Create pending organization
  const orgId = nanoid();
  await db().insert(organization).values({
    id: orgId,
    name: params.workspaceName,
    slug: params.workspaceSlug,
    status: ORG_STATUS.PENDING,
  });

  // Create membership for the user as owner
  await db().insert(member).values({
    id: nanoid(),
    organizationId: orgId,
    userId: params.userId,
    role: "owner",
  });

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer({
    orgId,
    email: params.userEmail,
    orgName: params.workspaceName,
  });

  // Metadata to store in the checkout session
  const metadata: Record<string, string> = {
    organizationId: orgId,
    workspaceName: params.workspaceName,
    workspaceSlug: params.workspaceSlug,
    userId: params.userId,
  };

  // Create checkout session
  const sessionParams: import("stripe").Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url:
      params.successUrl ||
      `${baseUrl}/dashboard/${params.workspaceSlug}?checkout=success`,
    cancel_url:
      params.cancelUrl ||
      `${baseUrl}/workspace/new?checkout=cancelled&orgId=${orgId}`,
    metadata,
    subscription_data: {
      metadata,
    },
  };

  // Add trial if requested (14 days, card required upfront)
  if (params.withTrial !== false) {
    sessionParams.subscription_data = {
      ...sessionParams.subscription_data,
      trial_period_days: TRIAL_DURATION_DAYS,
    };
    // Require credit card upfront for trials to reduce fraud and ensure conversion
    sessionParams.payment_method_collection = "always";
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return {
    checkoutUrl: session.url,
    pendingOrgId: orgId,
    sessionId: session.id,
  };
}

/**
 * Create a checkout session to upgrade an existing free workspace
 */
export async function createUpgradeCheckout(params: {
  orgId: string;
  priceId: string;
  userEmail: string;
  withTrial?: boolean;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const baseUrl = getBaseUrl();

  // Get organization
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, params.orgId))
    .limit(1);

  if (!org[0]) {
    throw new Error("Organization not found");
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer({
    orgId: params.orgId,
    email: params.userEmail,
    orgName: org[0].name,
  });

  const metadata = {
    organizationId: params.orgId,
    type: "upgrade",
  };

  const sessionParams: import("stripe").Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url:
      params.successUrl ||
      `${baseUrl}/dashboard/${org[0].slug}/~/settings/billing?checkout=success`,
    cancel_url:
      params.cancelUrl ||
      `${baseUrl}/dashboard/${org[0].slug}/~/settings/billing?checkout=cancelled`,
    metadata,
    subscription_data: {
      metadata,
    },
  };

  // Add trial if requested
  if (params.withTrial) {
    sessionParams.subscription_data = {
      ...sessionParams.subscription_data,
      trial_period_days: TRIAL_DURATION_DAYS,
    };
    // Require credit card upfront for trials to reduce fraud and ensure conversion
    sessionParams.payment_method_collection = "always";
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });
}

/**
 * Activate a pending organization after successful checkout
 * This is called from the webhook handler
 */
export async function activatePendingOrganization(
  orgId: string,
): Promise<void> {
  const { nanoid } = await import("nanoid");

  // Update organization status to active
  await db()
    .update(organization)
    .set({ status: ORG_STATUS.ACTIVE })
    .where(eq(organization.id, orgId));

  // Create default project if it doesn't exist
  const existingProjects = await db()
    .select()
    .from(project)
    .where(eq(project.organizationId, orgId));

  if (existingProjects.length === 0) {
    await db().insert(project).values({
      id: nanoid(),
      name: "Default Project",
      slug: "default",
      organizationId: orgId,
      isDefault: true,
    });
  }
}

/**
 * Cancel and clean up a pending organization
 * Used when checkout is cancelled or expires
 */
export async function cancelPendingOrganization(orgId: string): Promise<void> {
  // Check if organization is still pending
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org[0] || org[0].status !== ORG_STATUS.PENDING) {
    return; // Already activated or doesn't exist
  }

  // Delete the pending organization (cascade will delete members)
  await db().delete(organization).where(eq(organization.id, orgId));
}
