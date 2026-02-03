import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { organization, member } from "@repo/database/schema";
import { eq, and } from "@repo/database";
import { isReadOnly as checkIsReadOnly } from "./organization";
import { hasFeature, checkFeatureLimitAccess } from "./features";
import { BILLING_MANAGEMENT_ROLES, ORG_STATUS } from "./constants";

export interface BillingMiddlewareResult {
  allowed: boolean;
  error?: {
    status: number;
    message: string;
    code: string;
  };
}

/**
 * Check if the request is allowed based on organization status
 * Returns error response if organization is in read-only mode
 */
export async function checkReadOnlyAccess(
  orgId: string,
): Promise<BillingMiddlewareResult> {
  const isReadOnly = await checkIsReadOnly(orgId);

  if (isReadOnly) {
    return {
      allowed: false,
      error: {
        status: 403,
        message:
          "Workspace is in read-only mode. Please subscribe to a plan to reactivate your workspace.",
        code: "WORKSPACE_READONLY",
      },
    };
  }

  return { allowed: true };
}

/**
 * Check if organization status allows write operations
 */
export async function checkOrganizationWriteAccess(
  orgId: string,
): Promise<BillingMiddlewareResult> {
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org[0]) {
    return {
      allowed: false,
      error: {
        status: 404,
        message: "Workspace not found",
        code: "WORKSPACE_NOT_FOUND",
      },
    };
  }

  if (org[0].status === ORG_STATUS.PENDING) {
    return {
      allowed: false,
      error: {
        status: 403,
        message:
          "Workspace is pending activation. Please complete the subscription process.",
        code: "WORKSPACE_PENDING",
      },
    };
  }

  if (org[0].status === ORG_STATUS.READONLY) {
    return {
      allowed: false,
      error: {
        status: 403,
        message:
          "Workspace is in read-only mode. Please subscribe to a plan to reactivate your workspace.",
        code: "WORKSPACE_READONLY",
      },
    };
  }

  if (org[0].status === ORG_STATUS.SUSPENDED) {
    return {
      allowed: false,
      error: {
        status: 403,
        message: "Workspace has been suspended. Please contact support.",
        code: "WORKSPACE_SUSPENDED",
      },
    };
  }

  return { allowed: true };
}

/**
 * Check if a feature is available for the organization
 */
export async function checkFeatureAccess(
  orgId: string,
  featureKey: string,
): Promise<BillingMiddlewareResult> {
  const hasAccess = await hasFeature(orgId, featureKey);

  if (!hasAccess) {
    return {
      allowed: false,
      error: {
        status: 403,
        message: `This feature requires a paid plan. Please upgrade to access ${featureKey}.`,
        code: "FEATURE_NOT_AVAILABLE",
      },
    };
  }

  return { allowed: true };
}

/**
 * Check if adding a new item would exceed the feature limit
 */
export async function checkFeatureLimit(
  orgId: string,
  featureKey: string,
  currentCount: number,
  itemName = "item",
): Promise<BillingMiddlewareResult> {
  const canAdd = await checkFeatureLimitAccess(orgId, featureKey, currentCount);

  if (!canAdd) {
    return {
      allowed: false,
      error: {
        status: 403,
        message: `You have reached the maximum number of ${itemName}s allowed on your current plan. Please upgrade to add more.`,
        code: "LIMIT_EXCEEDED",
      },
    };
  }

  return { allowed: true };
}

/**
 * Check if user has billing management permissions for an organization
 */
export async function checkBillingPermission(
  userId: string,
  orgId: string,
): Promise<BillingMiddlewareResult> {
  const membership = await db()
    .select()
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
    .limit(1);

  if (!membership[0]) {
    return {
      allowed: false,
      error: {
        status: 403,
        message: "You are not a member of this workspace.",
        code: "NOT_A_MEMBER",
      },
    };
  }

  const canManage = BILLING_MANAGEMENT_ROLES.includes(
    membership[0].role as (typeof BILLING_MANAGEMENT_ROLES)[number],
  );

  if (!canManage) {
    return {
      allowed: false,
      error: {
        status: 403,
        message:
          "You do not have permission to manage billing for this workspace. Only owners and billing admins can manage billing.",
        code: "INSUFFICIENT_PERMISSIONS",
      },
    };
  }

  return { allowed: true };
}

/**
 * Create an error response from a middleware result
 */
export function createErrorResponse(
  result: BillingMiddlewareResult,
): NextResponse {
  if (result.allowed || !result.error) {
    throw new Error("Cannot create error response from allowed result");
  }

  return NextResponse.json(
    {
      error: result.error.message,
      code: result.error.code,
    },
    { status: result.error.status },
  );
}

/**
 * Combine multiple middleware checks
 * Returns the first failure or success if all pass
 */
export async function combineChecks(
  ...checks: Promise<BillingMiddlewareResult>[]
): Promise<BillingMiddlewareResult> {
  for (const check of checks) {
    const result = await check;
    if (!result.allowed) {
      return result;
    }
  }
  return { allowed: true };
}
