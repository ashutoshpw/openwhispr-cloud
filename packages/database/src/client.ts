import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle>;

function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const client = neon(process.env.DATABASE_URL);
    db = drizzle(client, { schema });
  }
  return db;
}

// Export a proxy that lazily initializes the database connection
export { getDb as db };
