/**
 * @repo/auth - Better Auth implementation
 *
 * This is a simplified, direct-export auth package for Better Auth.
 * No dynamic provider switching - just Better Auth.
 */

export * from "./types";
export { auth, getSession, getBetterAuthServer } from "./server";
export { mintBearerToken, latestSessionToken } from "./mint";
export {
  signIn,
  signUp,
  signOut,
  getSession as getClientSession,
  useSession,
  forgotPassword,
  getBaseClient,
} from "./client";
