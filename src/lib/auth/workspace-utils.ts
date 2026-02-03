import "server-only";

import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

// Cookie name for caching workspace status
export const HAS_WORKSPACE_COOKIE = "has_workspace";

// Cookie TTL in seconds (5 minutes)
export const WORKSPACE_COOKIE_TTL = 5 * 60;

/**
 * Check if the current user has any workspaces/organizations.
 * This is a server-side function that reads from the database.
 *
 * @param headers - Request headers containing session cookie
 * @returns true if user has at least one workspace, false otherwise
 */
export async function hasWorkspaces(headers: Headers): Promise<boolean> {
  try {
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      return false;
    }

    const count = await getWorkspaceCount(session.user.id);
    return count > 0;
  } catch (error) {
    console.error("[workspace-utils] Error checking workspaces:", error);
    return false;
  }
}

/**
 * Get the count of workspaces/organizations for a user.
 *
 * @param userId - The user ID to check
 * @returns Number of workspaces the user belongs to
 */
export async function getWorkspaceCount(userId: string): Promise<number> {
  try {
    const userMembers = await db()
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId));

    return userMembers.length;
  } catch (error) {
    console.error("[workspace-utils] Error getting workspace count:", error);
    return 0;
  }
}

/**
 * Get all workspaces/organizations for a user.
 *
 * @param userId - The user ID to check
 * @returns Array of organization objects
 */
export async function getUserWorkspaces(userId: string) {
  try {
    const userMembers = await db()
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId));

    const organizationIds = userMembers.map((m) => m.organizationId);

    if (organizationIds.length === 0) {
      return [];
    }

    const organizations = await db()
      .select()
      .from(organization)
      .where(inArray(organization.id, organizationIds));

    return organizations;
  } catch (error) {
    console.error("[workspace-utils] Error getting user workspaces:", error);
    return [];
  }
}

/**
 * Parse the workspace cookie value.
 *
 * @param cookieValue - The cookie value string
 * @returns true if user has workspaces, false if not, undefined if cookie not set or invalid
 */
export function parseWorkspaceCookie(
  cookieValue: string | undefined,
): boolean | undefined {
  if (cookieValue === "1") return true;
  if (cookieValue === "0") return false;
  return undefined;
}

/**
 * Generate the Set-Cookie header value for workspace status.
 *
 * @param hasWorkspace - Whether user has workspaces
 * @returns Cookie header value string
 */
export function getWorkspaceCookieValue(hasWorkspace: boolean): string {
  const value = hasWorkspace ? "1" : "0";
  return `${HAS_WORKSPACE_COOKIE}=${value}; Path=/; Max-Age=${WORKSPACE_COOKIE_TTL}; SameSite=Lax`;
}

/**
 * Generate the Set-Cookie header value to clear the workspace cookie.
 *
 * @returns Cookie header value string that clears the cookie
 */
export function getClearWorkspaceCookieValue(): string {
  return `${HAS_WORKSPACE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
