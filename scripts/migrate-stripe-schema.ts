import { runMigrations } from "stripe-sync-engine";
import "dotenv/config";
async function migrateStripeSchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("🔄 Running Stripe Sync Engine migrations...");
  console.log(`📦 Database: ${databaseUrl.split("@")[1] || "***"}`);

  try {
    await runMigrations({
      databaseUrl,
      schema: process.env.STRIPE_SCHEMA || "stripe",
    });

    console.log("✅ Stripe sync schema migrations completed successfully!");
    console.log("\n📊 The following tables have been created in the 'stripe' schema:");
    console.log("  - products");
    console.log("  - prices");
    console.log("  - customers");
    console.log("  - subscriptions");
    console.log("  - subscription_items");
    console.log("  - invoices");
    console.log("  - charges");
    console.log("  - payment_intents");
    console.log("  - payment_methods");
    console.log("  - checkout_sessions");
    console.log("  - checkout_session_line_items");
    console.log("  - disputes");
    console.log("  - refunds");
    console.log("  - coupons");
    console.log("  - plans");
    console.log("  - tax_ids");
    console.log("  - credit_notes");
    console.log("  - setup_intents");
    console.log("  - subscription_schedules");
    console.log("  - early_fraud_warning");
    console.log("  - reviews");
    console.log("  - features");
    console.log("  - active_entitlement");
    console.log("\n✨ Your Stripe webhook endpoint is ready to sync data!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateStripeSchema();
