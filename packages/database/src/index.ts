// Re-export everything from schema and client
export * from "./schema";
export * from "./schema-agents";
export * from "./schema-seo";
export { db } from "./client";

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
