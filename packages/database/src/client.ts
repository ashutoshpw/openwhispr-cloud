import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;

    // During build time, DATABASE_URL may not be available
    // Return a dummy db that will be replaced at runtime
    if (!databaseUrl) {
      // This will only be reached during build-time module evaluation
      // At runtime, DATABASE_URL should always be set
      if (
        process.env.NODE_ENV === "production" &&
        typeof window === "undefined"
      ) {
        // We're in a server context at build time, create a placeholder
        // that will throw if actually used
        return new Proxy({} as ReturnType<typeof drizzle>, {
          get() {
            throw new Error("DATABASE_URL environment variable is not set");
          },
        });
      }
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Create a postgres connection with proper configuration
    client = postgres(databaseUrl, {
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
