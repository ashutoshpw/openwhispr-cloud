// Re-export everything from schema and client
export * from "./schema";
export * from "./schema-ext";
export * from "./schema-analytics";
export * from "./schema-notes";
export * from "./schema-workspaces";
export * from "./schema-platform";
export { db } from "./client";

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
} from "drizzle-orm";
