/**
 * Database schema additions for AuthKit
 *
 * AuthKit is an external auth provider that requires syncing users
 * to the local database. This file contains any additional schema
 * elements specific to AuthKit.
 *
 * Base tables required:
 * - user: Core user data synced from AuthKit
 * - session: Local session tracking (synced from AuthKit sessions)
 * - account: Provider account linkage (providerId: "authkit")
 *
 * The base schema in packages/database/src/schema.ts should already
 * include these tables. No additional tables are required for AuthKit.
 */

// AuthKit uses the standard user/session/account tables
// No additional schema additions required

export const authkitSchemaAdditions = {
  // AuthKit stores the WorkOS user ID directly in user.id
  // The account table links with providerId: "authkit"
  // No additional fields needed beyond the base schema
};

/**
 * Notes on AuthKit integration:
 *
 * 1. User Sync:
 *    - When a user authenticates via AuthKit, their profile is synced to the user table
 *    - user.id = WorkOS user ID (e.g., "user_01HXYZ...")
 *    - user.email = primary email from WorkOS
 *    - user.name = firstName + lastName from WorkOS
 *    - user.image = profilePictureUrl from WorkOS
 *
 * 2. Account Linking:
 *    - account.providerId = "authkit"
 *    - account.accountId = WorkOS user ID
 *    - account.userId = local user ID (same as WorkOS user ID)
 *
 * 3. Session Management:
 *    - Sessions are managed by AuthKit via encrypted cookies
 *    - Local session table is used for additional tracking if needed
 *    - session.token = session identifier
 *    - session.userId = user ID
 */
