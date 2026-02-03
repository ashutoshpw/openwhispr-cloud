/**
 * @repo/auth - Main entry point
 *
 * For modular imports (recommended for tree-shaking):
 *   import { auth } from "@repo/auth/better-auth/server"
 *   import { signIn, useSession } from "@repo/auth/better-auth/client"
 *
 * For types:
 *   import type { UnifiedSession } from "@repo/auth/types"
 *
 * For config:
 *   import { getProviderName } from "@repo/auth/config"
 */

// Re-export types for convenience
export * from "./types";
export * from "./config";
export * from "./utils";
