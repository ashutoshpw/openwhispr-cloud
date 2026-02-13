/**
 * @repo/auth - WorkOS AuthKit authentication
 *
 * Server imports:
 *   import { getSession, signInEmail, signUpEmail, signOut, auth } from "@repo/auth/server"
 *
 * Client imports:
 *   import { useSession, signIn, signUp, signOut, forgotPassword } from "@repo/auth/client"
 *
 * Type imports:
 *   import type { UnifiedSession, UnifiedUser } from "@repo/auth/types"
 */

export * from "./types";
export { mapAuthKitSession } from "./server";
