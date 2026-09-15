import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as schemaAnalytics from "./schema-analytics";
import * as schemaExt from "./schema-ext";
import * as schemaNotes from "./schema-notes";
import * as schemaPlatform from "./schema-platform";
import * as schemaWorkspaces from "./schema-workspaces";

const mergedSchema = {
  ...schema,
  ...schemaExt,
  ...schemaAnalytics,
  ...schemaNotes,
  ...schemaWorkspaces,
  ...schemaPlatform,
};

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
