// Organization status types
export type OrganizationStatus =
  | "pending"
  | "active"
  | "readonly"
  | "suspended";

// Member roles including billing admin
export type MemberRole = "owner" | "billing_admin" | "admin" | "member";

// Audit log action types
export type AuditAction =
  | "workspace_created"
  | "subscription_created"
  | "subscription_cancelled"
  | "plan_upgraded"
  | "plan_downgraded"
  | "trial_started"
  | "trial_ended"
  | "status_changed"
  | "feature_granted"
  | "feature_revoked"
  | "payment_failed"
  | "payment_succeeded";

// Subscription status from Stripe
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

// Plan information
export interface PlanInfo {
  productId: string;
  productName: string;
  priceId: string;
  interval: "month" | "year";
  amount: number;
  currency: string;
  status: SubscriptionStatus;
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// Feature map type
export interface FeatureMap {
  [key: string]: string | number | boolean;
}

// Feature definition for type safety
export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  type: "boolean" | "number" | "string";
  defaultFreeValue: string | number | boolean;
}

// Usage summary for a workspace
export interface UsageSummary {
  members: {
    current: number;
    limit: number | "unlimited";
    percentage: number;
  };
  projects: {
    current: number;
    limit: number | "unlimited";
    percentage: number;
  };
}

// Downgrade check result
export interface DowngradeCheck {
  canDowngrade: boolean;
  blockers: DowngradeBlocker[];
}

export interface DowngradeBlocker {
  feature: string;
  featureLabel: string;
  current: number;
  limit: number;
  message: string;
}

// Checkout session params
export interface CreateCheckoutParams {
  priceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userId: string;
  userEmail: string;
  withTrial?: boolean;
  successUrl?: string;
  cancelUrl?: string;
}

// Checkout session result
export interface CheckoutResult {
  checkoutUrl: string;
  pendingOrgId: string;
  sessionId: string;
}

// Portal session params
export interface CreatePortalParams {
  organizationId: string;
  customerId: string;
  returnUrl: string;
}

// Billing API response types
export interface BillingSubscriptionResponse {
  plan: PlanInfo | null;
  status: OrganizationStatus;
  isFree: boolean;
  isTrialing: boolean;
  isReadOnly: boolean;
  trialEndsAt?: string;
  canManageBilling: boolean;
}

export interface BillingUsageResponse {
  usage: UsageSummary;
  canDowngradeToFree: boolean;
  downgradeBlockers: DowngradeBlocker[];
}

// Webhook metadata stored in Stripe checkout session
export interface CheckoutMetadata {
  organizationId: string;
  workspaceName: string;
  workspaceSlug: string;
  userId: string;
}

// Stripe subscription from stripe schema query
export interface StripeSubscription {
  id: string;
  customer: string;
  status: SubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  trial_start?: number;
  trial_end?: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
        recurring?: {
          interval: "month" | "year";
        };
      };
    }>;
  };
}

// Pricing tier for the billing page UI
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  features: string[];
  popular: boolean;
  exclusive: boolean;
  displayOrder: number;
  isContactPricing: boolean;
  actionLabel: string;
}

// Stripe product from stripe schema query
export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  metadata?: Record<string, string>;
}
