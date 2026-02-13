/**
 * App-level auth exports for NextAuth
 *
 * Re-exports from @repo/auth with app-specific utilities.
 */
import "server-only";

export { auth, getSession, handlers, signIn, signOut } from "@repo/auth/server";
export type { UnifiedSession, UnifiedUser } from "@repo/auth/types";

// Re-export workspace utilities
export {
  getWorkspaceCount,
  getUserWorkspaces,
  HAS_WORKSPACE_COOKIE,
  WORKSPACE_COOKIE_TTL,
} from "./workspace-utils";
