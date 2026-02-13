/**
 * Server-side auth utilities for AuthKit
 *
 * This module provides the getSession function for server components
 * and other server-side auth operations.
 */
import "server-only";

import { headers } from "next/headers";
import { getSession as getAuthSession, auth } from "@repo/auth/server";
import type { UnifiedSession } from "@repo/auth/types";

/**
 * Get the current user's session from server components
 *
 * @example
 * ```tsx
 * // In a server component
 * const session = await getSession();
 * if (session) {
 *   console.log('User:', session.user.email);
 * }
 * ```
 */
export async function getSession(): Promise<UnifiedSession | null> {
  const headersList = await headers();
  return getAuthSession(headersList);
}

/**
 * Get the current user from the session
 *
 * @example
 * ```tsx
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('Logged in as:', user.email);
 * }
 * ```
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Get session with role check
 * Returns null if user doesn't have the required role
 */
export async function getSessionWithRole(
  requiredRole: string,
): Promise<UnifiedSession | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.user.role !== requiredRole) return null;
  return session;
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.role === "site-admin";
}

// Re-export auth for API routes
export { auth };

// Re-export types
export type { UnifiedSession };
