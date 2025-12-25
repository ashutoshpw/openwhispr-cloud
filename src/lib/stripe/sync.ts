import { StripeSync } from "stripe-sync-engine";
import "dotenv/config";
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const stripeWebhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
const databaseUrl = requireEnv("DATABASE_URL");
const schema = process.env.STRIPE_SCHEMA ?? "stripe";
const maxConnections = process.env.PG_POOL_MAX
  ? Number(process.env.PG_POOL_MAX)
  : 10;

export const stripeSync = new StripeSync({
  poolConfig: {
    connectionString: databaseUrl,
    max: maxConnections,
    keepAlive: true,
  },
  schema,
  stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret,
  autoExpandLists: true,
  backfillRelatedEntities: true,
});
