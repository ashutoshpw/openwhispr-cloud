import { db } from "@repo/database";
import { organization, member } from "@repo/database/schema";
import { eq, and } from "@repo/database";
import {
  getSubscriptionWithProduct,
  isSubscriptionActive,
  isInTrial,
  getTrialEndDate,
} from "./subscription";
import { ORG_STATUS } from "./constants";
import type { OrganizationStatus, PlanInfo } from "./types";

/**
 * Get organization plan info
 * Returns null for free tier (no subscription)
 */
export async function getOrganizationPlan(
  orgId: string,
): Promise<PlanInfo | null> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org[0] || !org[0].stripeCustomerId) {
    return null; // Free tier
  }

  return getSubscriptionWithProduct(org[0].stripeCustomerId);
}

/**
 * Check if organization has an active paid subscription
 */
export async function hasActiveSubscription(orgId: string): Promise<boolean> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org[0] || !org[0].stripeCustomerId) {
    return false;
  }

  return isSubscriptionActive(org[0].stripeCustomerId);
}

/**
 * Check if organization is on free tier
 */
export async function isFreeTier(orgId: string): Promise<boolean> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org[0]) return true;

  // No stripe customer = free tier
  if (!org[0].stripeCustomerId) return true;

  // Has customer but no active subscription = free tier
  const hasSubscription = await isSubscriptionActive(org[0].stripeCustomerId);
  return !hasSubscription;
}

/**
 * Check if organization is in trial period
 */
export async function isOrganizationInTrial(orgId: string): Promise<boolean> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org[0] || !org[0].stripeCustomerId) {
    return false;
  }

  return isInTrial(org[0].stripeCustomerId);
}

/**
 * Get organization trial end date
 */
export async function getOrganizationTrialEndDate(
  orgId: string,
): Promise<Date | null> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org[0] || !org[0].stripeCustomerId) {
    return null;
  }

  return getTrialEndDate(org[0].stripeCustomerId);
}

/**
 * Check if organization is in read-only mode
 */
export async function isReadOnly(orgId: string): Promise<boolean> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  return org[0]?.status === ORG_STATUS.READONLY;
}

/**
 * Check if organization is active (not pending, readonly, or suspended)
 */
export async function isOrganizationActive(orgId: string): Promise<boolean> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  return org[0]?.status === ORG_STATUS.ACTIVE;
}

/**
 * Get organization status
 */
export async function getOrganizationStatus(
  orgId: string,
): Promise<OrganizationStatus | null> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  return (org[0]?.status as OrganizationStatus) || null;
}

/**
 * Check if user can create a free workspace
 * Users can only have one free workspace (where they are the owner)
 */
export async function canUserCreateFreeWorkspace(
  userId: string,
): Promise<boolean> {
  const count = await getUserOwnedFreeWorkspaceCount(userId);
  return count === 0;
}

/**
 * Get count of free workspaces owned by a user
 */
export async function getUserOwnedFreeWorkspaceCount(
  userId: string,
): Promise<number> {
  // Get all organizations where user is owner
  const ownedOrgs = await db()
    .select({
      organizationId: member.organizationId,
    })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.role, "owner")));

  if (ownedOrgs.length === 0) return 0;

  // Get organizations that are free (no stripe customer or no active subscription)
  const orgIds = ownedOrgs.map((o) => o.organizationId);

  let freeCount = 0;
  for (const orgId of orgIds) {
    const isFree = await isFreeTier(orgId);
    if (isFree) freeCount++;
  }

  return freeCount;
}

/**
 * Get all organizations owned by a user
 */
export async function getUserOwnedOrganizations(userId: string) {
  const ownedMembers = await db()
    .select()
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.role, "owner")));

  if (ownedMembers.length === 0) return [];

  const orgIds = ownedMembers.map((m) => m.organizationId);
  const orgs = [];

  for (const orgId of orgIds) {
    const org = await db()
      .select()
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);

    if (org[0]) {
      orgs.push(org[0]);
    }
  }

  return orgs;
}

/**
 * Update organization status
 */
export async function updateOrganizationStatus(
  orgId: string,
  status: OrganizationStatus,
): Promise<void> {
  await db()
    .update(organization)
    .set({ status })
    .where(eq(organization.id, orgId));
}

/**
 * Update organization stripe customer ID
 */
export async function updateOrganizationStripeCustomer(
  orgId: string,
  customerId: string,
): Promise<void> {
  await db()
    .update(organization)
    .set({ stripeCustomerId: customerId })
    .where(eq(organization.id, orgId));
}
