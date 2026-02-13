import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle>;
let client: ReturnType<typeof postgres>;

function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    // Create a postgres connection with proper configuration
    client = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    // Create drizzle instance
    db = drizzle(client, { schema });
  }
  return db;
}

// Export a proxy that lazily initializes the database connection
export { getDb as db };
