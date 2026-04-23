import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as schemaAgents from "./schema-agents";
import * as schemaSeo from "./schema-seo";

const mergedSchema = { ...schema, ...schemaAgents, ...schemaSeo };

let db: ReturnType<typeof drizzle>;

function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const client = neon(process.env.DATABASE_URL);
    db = drizzle(client, { schema: mergedSchema });
  }
  return db;
}

// Export a proxy that lazily initializes the database connection
export { getDb as db };
