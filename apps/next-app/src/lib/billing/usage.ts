import { db } from "@repo/database";
import { and, count, eq } from "@repo/database";
import { member, organization, project } from "@repo/database/schema";
import { FEATURE_KEYS, FREE_TIER_FEATURES } from "./constants";
import { getFeatureLimit, getOrganizationFeatures } from "./features";
import type { DowngradeBlocker, DowngradeCheck, UsageSummary } from "./types";

/**
 * Get current member count for an organization
 */
export async function getCurrentMemberCount(orgId: string): Promise<number> {
  const result = await db()
    .select({ count: count() })
    .from(member)
    .where(eq(member.organizationId, orgId));

  return result[0]?.count ?? 0;
}

/**
 * Get current project count for an organization
 */
export async function getCurrentProjectCount(orgId: string): Promise<number> {
  const result = await db()
    .select({ count: count() })
    .from(project)
    .where(eq(project.organizationId, orgId));

  return result[0]?.count ?? 0;
}

/**
 * Check if organization can add a new member
 */
export async function canAddMember(orgId: string): Promise<boolean> {
  const currentCount = await getCurrentMemberCount(orgId);
  const limit = await getFeatureLimit(orgId, FEATURE_KEYS.MAX_MEMBERS);

  if (limit === null) return false;
  if (limit === "unlimited") return true;

  return currentCount < limit;
}

/**
 * Check if organization can add a new project
 */
export async function canAddProject(orgId: string): Promise<boolean> {
  const currentCount = await getCurrentProjectCount(orgId);
  const limit = await getFeatureLimit(orgId, FEATURE_KEYS.MAX_PROJECTS);

  if (limit === null) return false;
  if (limit === "unlimited") return true;

  return currentCount < limit;
}

/**
 * Get usage summary for an organization
 */
export async function getUsageSummary(orgId: string): Promise<UsageSummary> {
  const [memberCount, projectCount, memberLimit, projectLimit] =
    await Promise.all([
      getCurrentMemberCount(orgId),
      getCurrentProjectCount(orgId),
      getFeatureLimit(orgId, FEATURE_KEYS.MAX_MEMBERS),
      getFeatureLimit(orgId, FEATURE_KEYS.MAX_PROJECTS),
    ]);

  return {
    members: {
      current: memberCount,
      limit: memberLimit ?? 0,
      percentage: calculatePercentage(memberCount, memberLimit),
    },
    projects: {
      current: projectCount,
      limit: projectLimit ?? 0,
      percentage: calculatePercentage(projectCount, projectLimit),
    },
  };
}

/**
 * Calculate percentage of usage
 */
function calculatePercentage(
  current: number,
  limit: number | "unlimited" | null,
): number {
  if (limit === null || limit === "unlimited" || limit === 0) {
    return 0;
  }
  return Math.min(Math.round((current / limit) * 100), 100);
}

/**
 * Check if organization can downgrade to a specific plan
 */
export async function canDowngradeToPlan(
  orgId: string,
  targetProductId: string | null, // null means free tier
): Promise<DowngradeCheck> {
  const blockers: DowngradeBlocker[] = [];

  // Get target plan features (free tier if null)
  let targetFeatures = { ...FREE_TIER_FEATURES };

  if (targetProductId) {
    // Import here to avoid circular dependency
    const { getTierFeatures } = await import("./features");
    const tierFeatures = await getTierFeatures(targetProductId);
    targetFeatures = { ...FREE_TIER_FEATURES, ...tierFeatures };
  }

  // Check member limit
  const memberCount = await getCurrentMemberCount(orgId);
  const targetMemberLimit = targetFeatures[FEATURE_KEYS.MAX_MEMBERS];

  if (
    typeof targetMemberLimit === "number" &&
    memberCount > targetMemberLimit
  ) {
    blockers.push({
      feature: FEATURE_KEYS.MAX_MEMBERS,
      featureLabel: "Team Members",
      current: memberCount,
      limit: targetMemberLimit,
      message: `You have ${memberCount} members, but the target plan only allows ${targetMemberLimit}. Please remove ${memberCount - targetMemberLimit} member(s) before downgrading.`,
    });
  }

  // Check project limit
  const projectCount = await getCurrentProjectCount(orgId);
  const targetProjectLimit = targetFeatures[FEATURE_KEYS.MAX_PROJECTS];

  if (
    typeof targetProjectLimit === "number" &&
    projectCount > targetProjectLimit
  ) {
    blockers.push({
      feature: FEATURE_KEYS.MAX_PROJECTS,
      featureLabel: "Projects",
      current: projectCount,
      limit: targetProjectLimit,
      message: `You have ${projectCount} projects, but the target plan only allows ${targetProjectLimit}. Please delete ${projectCount - targetProjectLimit} project(s) before downgrading.`,
    });
  }

  return {
    canDowngrade: blockers.length === 0,
    blockers,
  };
}

/**
 * Check if organization can downgrade to free tier
 */
export async function canDowngradeToFree(
  orgId: string,
): Promise<DowngradeCheck> {
  return canDowngradeToPlan(orgId, null);
}

/**
 * Get remaining capacity for a feature
 */
export async function getRemainingCapacity(
  orgId: string,
  featureKey: string,
  currentCount: number,
): Promise<number | "unlimited"> {
  const limit = await getFeatureLimit(orgId, featureKey);

  if (limit === null) return 0;
  if (limit === "unlimited") return "unlimited";

  return Math.max(0, limit - currentCount);
}
