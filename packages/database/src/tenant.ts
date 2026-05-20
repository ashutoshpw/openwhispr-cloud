import { randomUUID } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { db } from "./client";
import { tenant, tenantDomain } from "./schema";

export const DEFAULT_TENANT_ID = "default";

function getDefaultTenantId() {
  return process.env.DEFAULT_TENANT_ID?.trim() || DEFAULT_TENANT_ID;
}

export type TenantSeedInput = {
  id?: string;
  slug?: string;
  name?: string;
  platformName?: string;
  domain?: string;
  supportEmail?: string;
  logoUrl?: string;
  faviconUrl?: string;
};

export function normalizeTenantDomain(hostOrUrl: string | null | undefined) {
  if (!hostOrUrl) return null;
  const raw = hostOrUrl.trim().toLowerCase();
  if (!raw) return null;

  let host = raw;
  try {
    host = new URL(raw.includes("://") ? raw : `http://${raw}`).host;
  } catch {
    host = raw;
  }

  return host.replace(/:\d+$/, "");
}

export function isLocalTenantHost(host: string | null | undefined) {
  const normalized = normalizeTenantDomain(host);
  return (
    !normalized ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  );
}

export function buildTenantAuthEmail(tenantId: string, email: string) {
  return `${tenantId}:${email.trim().toLowerCase()}`;
}

export function readDefaultTenantSeedFromEnv(): Required<
  Pick<TenantSeedInput, "id" | "slug" | "name" | "platformName">
> &
  Omit<TenantSeedInput, "id" | "slug" | "name" | "platformName"> {
  const id = process.env.DEFAULT_TENANT_ID?.trim() || DEFAULT_TENANT_ID;
  const name =
    process.env.DEFAULT_TENANT_NAME?.trim() ||
    process.env.DEFAULT_TENANT_PLATFORM_NAME?.trim() ||
    "Default Platform";

  return {
    id,
    slug: process.env.DEFAULT_TENANT_SLUG?.trim() || id,
    name,
    platformName: process.env.DEFAULT_TENANT_PLATFORM_NAME?.trim() || name,
    domain:
      normalizeTenantDomain(
        process.env.DEFAULT_TENANT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL,
      ) ?? undefined,
    supportEmail: process.env.DEFAULT_TENANT_SUPPORT_EMAIL?.trim() || undefined,
    logoUrl: process.env.DEFAULT_TENANT_LOGO_URL?.trim() || undefined,
    faviconUrl: process.env.DEFAULT_TENANT_FAVICON_URL?.trim() || undefined,
  };
}

export async function ensureDefaultTenant(input: TenantSeedInput = {}) {
  const envSeed = readDefaultTenantSeedFromEnv();
  const seed = {
    ...envSeed,
    ...input,
    id: input.id || envSeed.id,
    slug: input.slug || envSeed.slug,
    name: input.name || envSeed.name,
    platformName: input.platformName || envSeed.platformName,
  };

  await db()
    .insert(tenant)
    .values({
      id: seed.id,
      slug: seed.slug,
      name: seed.name,
      platformName: seed.platformName,
      supportEmail: seed.supportEmail,
      logoUrl: seed.logoUrl,
      faviconUrl: seed.faviconUrl,
    })
    .onConflictDoUpdate({
      target: tenant.id,
      set: {
        slug: seed.slug,
        name: seed.name,
        platformName: seed.platformName,
        supportEmail: seed.supportEmail,
        logoUrl: seed.logoUrl,
        faviconUrl: seed.faviconUrl,
      },
    });

  const domain = normalizeTenantDomain(seed.domain);
  if (domain) {
    await db()
      .insert(tenantDomain)
      .values({
        id: randomUUID(),
        tenantId: seed.id,
        domain,
        isPrimary: true,
      })
      .onConflictDoUpdate({
        target: tenantDomain.domain,
        set: {
          tenantId: seed.id,
          isPrimary: true,
        },
      });
  }

  const [row] = await db()
    .select()
    .from(tenant)
    .where(eq(tenant.id, seed.id))
    .limit(1);
  return row;
}

export async function resolveTenantFromHost(host: string | null | undefined) {
  const normalized = normalizeTenantDomain(host);

  if (isLocalTenantHost(normalized)) {
    const [row] = await db()
      .select()
      .from(tenant)
      .where(eq(tenant.id, getDefaultTenantId()))
      .limit(1);
    return row ?? null;
  }

  const [row] = await db()
    .select({ tenant })
    .from(tenantDomain)
    .innerJoin(tenant, eq(tenantDomain.tenantId, tenant.id))
    .where(
      and(
        eq(tenantDomain.domain, normalized ?? ""),
        or(eq(tenant.status, "active"), eq(tenant.status, "readonly")),
      ),
    )
    .limit(1);

  return row?.tenant ?? null;
}
