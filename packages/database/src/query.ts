import { config } from "dotenv";
import { resolve } from "node:path";
import { Pool } from "@neondatabase/serverless";

// Load .env.local from monorepo root
config({ path: resolve(__dirname, "../../.env.local") });

const sql = process.argv[2];

if (!sql) {
  console.log(`
Usage:
  bun run db:query "SQL_QUERY_HERE"

Examples:
  bun run db:query "SELECT * FROM user LIMIT 10"
  bun run db:query "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  console.error("Make sure .env.local exists at the monorepo root.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(sql);
  if (result.rows.length === 0) {
    console.log("Query returned no rows.");
  } else {
    console.table(result.rows);
  }
} catch (err) {
  console.error("Query failed:", (err as Error).message);
  process.exit(1);
} finally {
  await pool.end();
}
