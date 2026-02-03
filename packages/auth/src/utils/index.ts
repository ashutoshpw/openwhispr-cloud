/**
 * @repo/auth - Schema mapping utilities
 * Import via: import { mapBetterAuthSession, ... } from "@repo/auth/utils"
 */

import type { UnifiedSession, UnifiedUser } from "../types";

export function normalizeUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
}): UnifiedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role ?? null,
  };
}

export function mapBetterAuthSession(
  session:
    | {
        user?: {
          id: string;
          email: string;
          name?: string | null;
          image?: string | null;
          role?: string | null;
        } | null;
        expiresAt?: Date;
      }
    | null
    | undefined,
): UnifiedSession | null {
  if (!session || !session.user) {
    return null;
  }

  return {
    user: normalizeUser(session.user),
    expiresAt:
      session.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

export function mapNextAuthSession(
  session:
    | {
        user: {
          id: string;
          email: string;
          name?: string | null;
          image?: string | null;
        };
        expires?: string | null;
      }
    | null
    | undefined,
): UnifiedSession | null {
  if (!session) return null;

  const expiresAt = session.expires
    ? new Date(session.expires)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    user: normalizeUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: null,
    }),
    expiresAt,
  };
}

export function mapAuthKitSession(
  user:
    | {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        profilePictureUrl?: string | null;
      }
    | null
    | undefined,
): UnifiedSession | null {
  if (!user) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  return {
    user: normalizeUser({
      id: user.id,
      email: user.email,
      name,
      image: user.profilePictureUrl ?? null,
      role: null,
    }),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

export function mapClerkSession(
  user:
    | {
        id: string;
        emailAddresses: Array<{ emailAddress: string }>;
        firstName?: string | null;
        lastName?: string | null;
        imageUrl?: string | null;
      }
    | null
    | undefined,
): UnifiedSession | null {
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress || "";
  if (!email) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  return {
    user: normalizeUser({
      id: user.id,
      email,
      name,
      image: user.imageUrl ?? null,
      role: null,
    }),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}
