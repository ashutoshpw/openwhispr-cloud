// Re-export everything from schema and client
export * from "./schema";
export * from "./schema-agent-auth";
export * from "./schema-agents";
export * from "./schema-analytics";
export * from "./schema-seo";
export { db } from "./client";
export {
  DEFAULT_TENANT_ID,
  buildTenantAuthEmail,
  ensureDefaultTenant,
  isLocalTenantHost,
  normalizeTenantDomain,
  readDefaultTenantSeedFromEnv,
  resolveTenantFromHost,
} from "./tenant";

// DAL helpers
export { getAdminStats } from "./dal/admin";
export type { AdminStats } from "./dal/admin";

// Re-export drizzle-orm operators for convenience
export {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  and,
  or,
  not,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  sql,
  asc,
  desc,
  count,
  sum,
  avg,
  min,
  max,
} from "drizzle-orm";
