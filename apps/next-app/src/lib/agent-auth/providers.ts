import "server-only";

import { db } from "@repo/database";
import { agentProvider } from "@repo/database/schema-agent-auth";
import type { AgentProvider } from "@repo/database/schema-agent-auth";
import { and, eq } from "drizzle-orm";
import { type JWTVerifyGetKey, createRemoteJWKSet } from "jose";

export type TrustedProvider = AgentProvider;

/** Look up a trusted provider by issuer within a tenant's trust list. */
export async function findTrustedProvider(
  tenantId: string,
  issuer: string,
): Promise<TrustedProvider | null> {
  const [row] = await db()
    .select()
    .from(agentProvider)
    .where(
      and(
        eq(agentProvider.tenantId, tenantId),
        eq(agentProvider.issuer, issuer),
        eq(agentProvider.status, "active"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export function jwksUriFor(provider: TrustedProvider): string {
  const base = provider.issuer.replace(/\/$/, "");
  return provider.jwksUri ?? `${base}/.well-known/jwks.json`;
}

type CacheEntry = {
  remoteJwks: ReturnType<typeof createRemoteJWKSet>;
  fetchedAt: number;
};

const jwksCache = new Map<string, CacheEntry>();
const FLOOR_MS = 10 * 60 * 1000; // refetch at least every 10 minutes
const CEILING_MS = 24 * 60 * 60 * 1000;

/**
 * Create a jose key resolver for a provider's JWKS. Cached for a clamped
 * 10min–24h window and refetched once on failure (cooldown-limited) so
 * provider key rotation works without restarts.
 */
export function getProviderKeyResolver(
  provider: TrustedProvider,
): JWTVerifyGetKey {
  const uri = jwksUriFor(provider);

  function buildRemote() {
    const remote = createRemoteJWKSet(new URL(uri));
    jwksCache.set(uri, {
      remoteJwks: remote,
      fetchedAt: Date.now(),
    });
    return remote;
  }

  const existing = jwksCache.get(uri);
  const remote = existing?.remoteJwks ?? buildRemote();

  return async (protectedHeader, token) => {
    const entry = jwksCache.get(uri);
    const stale = entry ? Date.now() - entry.fetchedAt > CEILING_MS : true;

    try {
      return await remote(protectedHeader, token);
    } catch (err) {
      // Refetch once per cool-down window on failure (handles kid rotation).
      const cached = jwksCache.get(uri);
      if (cached && !stale && Date.now() - cached.fetchedAt > FLOOR_MS) {
        buildRemote();
        const fresh = jwksCache.get(uri);
        if (fresh) {
          return await fresh.remoteJwks(protectedHeader, token);
        }
      }
      throw err;
    }
  };
}

/** Fetch helper used by discovery of provider display names etc. (reserved). */
export async function listTrustedProviders(
  tenantId: string,
): Promise<TrustedProvider[]> {
  return db()
    .select()
    .from(agentProvider)
    .where(eq(agentProvider.tenantId, tenantId));
}
