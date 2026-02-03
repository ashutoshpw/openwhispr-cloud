#!/usr/bin/env tsx
/**
 * Interactive Stripe setup script
 * Run with: bun run setup:stripe
 *
 * This script helps you:
 * 1. Verify Stripe API keys
 * 2. Configure webhooks
 * 3. Run database migrations for stripe-sync-engine
 * 4. Create default products and pricing plans
 * 5. Sync existing Stripe data to your database
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { confirm, input } from "@inquirer/prompts";
import { config } from "dotenv";
import Stripe from "stripe";
import { runMigrations } from "stripe-sync-engine";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Webhook events to register
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  // Products & Prices
  "product.created",
  "product.updated",
  "product.deleted",
  "price.created",
  "price.updated",
  "price.deleted",
  // Customers
  "customer.created",
  "customer.updated",
  "customer.deleted",
  // Subscriptions
  "subscription_schedule.created",
  "subscription_schedule.updated",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  // Invoices
  "invoice.created",
  "invoice.updated",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.finalized",
  // Charges
  "charge.succeeded",
  "charge.failed",
  "charge.refunded",
  // Payment Intents
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  // Payment Methods
  "payment_method.attached",
  "payment_method.detached",
  // Checkout Sessions
  "checkout.session.completed",
  "checkout.session.expired",
  // Coupons & Promo Codes
  "coupon.created",
  "coupon.updated",
  "coupon.deleted",
  "promotion_code.created",
  "promotion_code.updated",
  // Disputes & Refunds
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  // Setup Intents
  "setup_intent.succeeded",
  "setup_intent.setup_failed",
];

interface SetupResult {
  keysVerified: boolean;
  webhookConfigured: boolean;
  webhookSecret?: string;
  migrationRan: boolean;
  productsCreated: { name: string; id: string; priceIds: string[] }[];
  dataBackfilled: boolean;
}

// Helper: Print section header
function printHeader(text: string) {
  console.log("");
  console.log(`${colors.cyan}${"━".repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${text}${colors.reset}`);
  console.log(`${colors.cyan}${"━".repeat(60)}${colors.reset}`);
  console.log("");
}

// Helper: Print success message
function printSuccess(text: string) {
  console.log(`  ${colors.green}✓${colors.reset} ${text}`);
}

// Helper: Print error message
function printError(text: string) {
  console.log(`  ${colors.red}✗${colors.reset} ${text}`);
}

// Helper: Print warning message
function printWarning(text: string) {
  console.log(`  ${colors.yellow}⚠${colors.reset} ${text}`);
}

// Helper: Print info message
function printInfo(text: string) {
  console.log(`  ${colors.blue}ℹ${colors.reset} ${text}`);
}

// Helper: Parse existing .env file into Map
function parseEnvFile(content: string): Map<string, string> {
  const env = new Map<string, string>();
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      env.set(key, value);
    }
  }

  return env;
}

// Helper: Update .env.local file with new values
function updateEnvFile(updates: Record<string, string>): void {
  const envPath = resolve(process.cwd(), ".env.local");
  let content = "";

  if (existsSync(envPath)) {
    content = readFileSync(envPath, "utf-8");
  }

  const existingEnv = parseEnvFile(content);

  // Update existing values or prepare to add new ones
  for (const [key, value] of Object.entries(updates)) {
    if (existingEnv.has(key)) {
      // Replace existing line
      const regex = new RegExp(`^${key}=.*$`, "m");
      content = content.replace(regex, `${key}=${value}`);
    } else {
      // Add to Stripe section or end of file
      const stripeSection = content.indexOf("# Stripe");
      if (stripeSection !== -1) {
        // Find end of Stripe section (next section or end of file)
        const nextSection = content.indexOf("\n# ", stripeSection + 1);
        const insertPos = nextSection !== -1 ? nextSection : content.length;
        content = `${content.slice(0, insertPos)}${key}=${value}\n${content.slice(insertPos)}`;
      } else {
        // Add Stripe section at end
        content += `\n# ${"=".repeat(44)}\n# Stripe\n# ${"=".repeat(44)}\n${key}=${value}\n`;
      }
    }
  }

  writeFileSync(envPath, content, "utf-8");
}

// Step 1: Verify API Keys
async function verifyApiKeys(): Promise<{
  valid: boolean;
  isLiveMode: boolean;
  stripe: Stripe | null;
}> {
  printHeader("STEP 1: VERIFY STRIPE API KEYS");

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  // Check if keys exist
  if (!secretKey) {
    printError("STRIPE_SECRET_KEY is not set in .env.local");
    console.log("");
    console.log(
      `  ${colors.dim}Get your API keys from: ${colors.cyan}https://dashboard.stripe.com/apikeys${colors.reset}`,
    );
    console.log(
      `  ${colors.dim}Add to .env.local: STRIPE_SECRET_KEY=sk_test_...${colors.reset}`,
    );
    return { valid: false, isLiveMode: false, stripe: null };
  }

  // Validate secret key format
  if (secretKey.startsWith("pk_")) {
    printError("STRIPE_SECRET_KEY contains a PUBLISHABLE key (pk_...)");
    printInfo("Secret keys should start with: sk_test_ or sk_live_");
    printInfo(
      "You may have swapped STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY",
    );
    return { valid: false, isLiveMode: false, stripe: null };
  }

  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
    printError("STRIPE_SECRET_KEY has invalid format");
    printInfo("Should start with: sk_test_ or sk_live_");
    return { valid: false, isLiveMode: false, stripe: null };
  }

  const isLiveMode = secretKey.startsWith("sk_live_");

  // Check publishable key if provided
  if (publishableKey) {
    if (publishableKey.startsWith("sk_")) {
      printWarning("STRIPE_PUBLISHABLE_KEY contains a SECRET key (sk_...)");
      printInfo("Publishable keys should start with: pk_test_ or pk_live_");
    } else if (
      !publishableKey.startsWith("pk_test_") &&
      !publishableKey.startsWith("pk_live_")
    ) {
      printWarning("STRIPE_PUBLISHABLE_KEY has invalid format");
    } else {
      printSuccess(
        `STRIPE_PUBLISHABLE_KEY: ${publishableKey.slice(0, 12)}...${publishableKey.slice(-4)}`,
      );
    }
  } else {
    printWarning(
      "STRIPE_PUBLISHABLE_KEY is not set (optional for backend-only)",
    );
  }

  printSuccess(
    `STRIPE_SECRET_KEY: ${secretKey.slice(0, 12)}...${secretKey.slice(-4)}`,
  );

  // Live mode warning
  if (isLiveMode) {
    console.log("");
    console.log(
      `  ${colors.yellow}${colors.bold}╔════════════════════════════════════════════════════════╗${colors.reset}`,
    );
    console.log(
      `  ${colors.yellow}${colors.bold}║  ⚠️  WARNING: YOU ARE USING LIVE MODE CREDENTIALS!     ║${colors.reset}`,
    );
    console.log(
      `  ${colors.yellow}${colors.bold}║                                                        ║${colors.reset}`,
    );
    console.log(
      `  ${colors.yellow}${colors.bold}║  This will affect your REAL Stripe account.           ║${colors.reset}`,
    );
    console.log(
      `  ${colors.yellow}${colors.bold}║  Products and webhooks will be created in production. ║${colors.reset}`,
    );
    console.log(
      `  ${colors.yellow}${colors.bold}╚════════════════════════════════════════════════════════╝${colors.reset}`,
    );
    console.log("");

    const proceedLive = await confirm({
      message: "Are you sure you want to proceed with LIVE mode credentials?",
      default: false,
    });

    if (!proceedLive) {
      console.log(
        `\n${colors.dim}Setup cancelled. Switch to test keys (sk_test_...) for development.${colors.reset}`,
      );
      return { valid: false, isLiveMode: true, stripe: null };
    }
  }

  // Test API connection
  console.log("");
  printInfo("Testing API connection...");

  const stripe = new Stripe(secretKey, { typescript: true });

  try {
    const account = await stripe.accounts.retrieve();
    printSuccess(
      `Connected to Stripe account: ${account.settings?.dashboard?.display_name || account.id}`,
    );
    console.log(`  ${colors.dim}Account ID: ${account.id}${colors.reset}`);

    return { valid: true, isLiveMode, stripe };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    printError(`Failed to connect to Stripe: ${errorMessage}`);
    return { valid: false, isLiveMode, stripe: null };
  }
}

// Step 2: Configure Webhook
async function configureWebhook(
  stripe: Stripe,
): Promise<{ configured: boolean; secret?: string }> {
  printHeader("STEP 2: CONFIGURE WEBHOOK");

  const existingWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (existingWebhookSecret) {
    printInfo(
      `Existing STRIPE_WEBHOOK_SECRET found: ${existingWebhookSecret.slice(0, 10)}...`,
    );

    const reconfigure = await confirm({
      message: "Reconfigure webhook endpoint?",
      default: false,
    });

    if (!reconfigure) {
      printSuccess("Keeping existing webhook configuration");
      return { configured: true, secret: existingWebhookSecret };
    }
  }

  // Get base URL
  const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8801";

  const baseUrl = await input({
    message: "Base URL for webhook endpoint:",
    default: defaultUrl,
  });

  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/stripe`;

  console.log("");
  printInfo(`Webhook endpoint: ${colors.cyan}${webhookUrl}${colors.reset}`);
  console.log("");
  console.log(`  ${colors.dim}Events to register:${colors.reset}`);

  // Group events by category for display
  const eventCategories: Record<string, string[]> = {};
  for (const event of WEBHOOK_EVENTS) {
    const category = event.split(".")[0];
    if (!eventCategories[category]) {
      eventCategories[category] = [];
    }
    eventCategories[category].push(event);
  }

  for (const [category, events] of Object.entries(eventCategories)) {
    console.log(
      `    ${colors.cyan}${category}:${colors.reset} ${events.map((e) => e.split(".").slice(1).join(".")).join(", ")}`,
    );
  }
  console.log("");

  const createWebhook = await confirm({
    message: "Create/update this webhook endpoint in Stripe?",
    default: true,
  });

  if (!createWebhook) {
    printWarning("Webhook configuration skipped");
    console.log("");
    console.log(
      `  ${colors.dim}To configure manually, go to: ${colors.cyan}https://dashboard.stripe.com/webhooks${colors.reset}`,
    );
    return { configured: false };
  }

  try {
    // Check if webhook already exists for this URL
    const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const existingEndpoint = existingWebhooks.data.find(
      (w) => w.url === webhookUrl,
    );

    let webhookEndpoint: Stripe.WebhookEndpoint;

    if (existingEndpoint) {
      printInfo(`Updating existing webhook endpoint: ${existingEndpoint.id}`);

      webhookEndpoint = await stripe.webhookEndpoints.update(
        existingEndpoint.id,
        {
          enabled_events: WEBHOOK_EVENTS,
          description: "NextJS Starter Kit - Stripe Sync Engine",
        },
      );

      printSuccess("Webhook endpoint updated successfully");
      console.log("");
      printWarning(
        "Note: Webhook secret cannot be retrieved after initial creation.",
      );
      printInfo(
        "If you need a new secret, delete the webhook in Stripe Dashboard and run this setup again.",
      );

      // Prompt for existing secret if not in env
      if (!existingWebhookSecret) {
        console.log("");
        const manualSecret = await input({
          message:
            "Enter your existing webhook secret (whsec_...) or leave empty to skip:",
          default: "",
        });

        if (manualSecret) {
          updateEnvFile({ STRIPE_WEBHOOK_SECRET: manualSecret });
          printSuccess("Updated .env.local with webhook secret");
          return { configured: true, secret: manualSecret };
        }
      }

      return { configured: true, secret: existingWebhookSecret };
    }

    // Create new webhook endpoint
    printInfo("Creating new webhook endpoint...");

    webhookEndpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: WEBHOOK_EVENTS,
      description: "NextJS Starter Kit - Stripe Sync Engine",
    });

    const webhookSecret = webhookEndpoint.secret;

    printSuccess(`Webhook created: ${webhookEndpoint.id}`);

    if (webhookSecret) {
      // Update .env.local with the new secret
      updateEnvFile({ STRIPE_WEBHOOK_SECRET: webhookSecret });
      printSuccess("Updated .env.local with STRIPE_WEBHOOK_SECRET");
      return { configured: true, secret: webhookSecret };
    }

    printWarning("Webhook secret not returned. Check Stripe Dashboard.");
    return { configured: true };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    printError(
      `Failed to configure webhook: ${err.message ?? "Unknown error"}`,
    );

    if (err.code === "resource_already_exists") {
      printInfo("A webhook for this URL already exists.");
      printInfo(
        `Manage webhooks at: ${colors.cyan}https://dashboard.stripe.com/webhooks${colors.reset}`,
      );
    }

    return { configured: false };
  }
}

// Step 3: Run Database Migrations
async function runDatabaseMigrations(): Promise<boolean> {
  printHeader("STEP 3: DATABASE MIGRATIONS");

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    printError("DATABASE_URL is not set in .env.local");
    printInfo("Database migrations require a PostgreSQL connection string");
    return false;
  }

  const dbHost = databaseUrl.includes("@")
    ? (databaseUrl.split("@")[1]?.split("/")[0] ?? "***")
    : "***";
  printInfo(`Database: ${dbHost}`);

  const runMigration = await confirm({
    message: "Run stripe-sync-engine migrations?",
    default: true,
  });

  if (!runMigration) {
    printWarning("Database migrations skipped");
    return false;
  }

  try {
    printInfo("Running migrations...");

    await runMigrations({
      databaseUrl,
      schema: process.env.STRIPE_SCHEMA || "stripe",
    });

    printSuccess("Stripe sync schema migrations completed!");
    console.log("");
    console.log(
      `  ${colors.dim}Created tables in 'stripe' schema:${colors.reset}`,
    );
    console.log(
      `  ${colors.dim}products, prices, customers, subscriptions, invoices, charges,${colors.reset}`,
    );
    console.log(
      `  ${colors.dim}payment_intents, payment_methods, checkout_sessions, and more.${colors.reset}`,
    );

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    printError(`Migration failed: ${errorMessage}`);

    if (errorMessage.includes("connection")) {
      printInfo("Check your DATABASE_URL connection string");
      printInfo("Ensure your database server is running and accessible");
    }

    return false;
  }
}

// Step 4: Create Default Products
async function createDefaultProducts(
  stripe: Stripe,
): Promise<{ name: string; id: string; priceIds: string[] }[]> {
  printHeader("STEP 4: CREATE PRICING TIERS");

  console.log(
    `  ${colors.dim}Note: Free tier is managed locally and not created in Stripe.${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}Products are created with generic names (Tier 1, Tier 2, etc.).${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}You can rename them later in the admin portal: /adminx/stripe/products${colors.reset}`,
  );
  console.log("");

  const createProducts = await confirm({
    message: "Create pricing tiers?",
    default: true,
  });

  if (!createProducts) {
    printWarning("Product creation skipped");
    printInfo(
      `You can create products later in the admin portal: ${colors.cyan}/adminx/stripe/products${colors.reset}`,
    );
    return [];
  }

  const createdProducts: { name: string; id: string; priceIds: string[] }[] =
    [];

  // Helper function to get price input
  const getPriceInput = async (
    tierName: string,
    periodLabel: string,
    defaultValue: string,
  ): Promise<string> => {
    return await input({
      message: `${tierName} ${periodLabel} price (USD):`,
      default: defaultValue,
      validate: (val) => {
        const num = Number.parseFloat(val);
        if (Number.isNaN(num) || num < 0) return "Please enter a valid price";
        return true;
      },
    });
  };

  // Default features for each tier
  const tierFeatures: Record<number, string[]> = {
    1: [
      "Core features included",
      "Email support",
      "Basic analytics",
      "Up to 1,000 requests/month",
    ],
    2: [
      "Everything in Tier 1",
      "Priority email support",
      "Advanced analytics",
      "Up to 10,000 requests/month",
      "API access",
    ],
    3: [
      "Everything in Tier 2",
      "24/7 priority support",
      "Custom analytics",
      "Unlimited requests",
      "API access",
      "Custom integrations",
    ],
  };

  // Helper function to create a tier
  const createTier = async (
    tierNumber: number,
    monthlyDefault: string,
    yearlyDefault: string,
  ): Promise<{ name: string; id: string; priceIds: string[] } | null> => {
    const tierName = `Tier ${tierNumber}`;
    console.log("");
    console.log(`  ${colors.bold}${tierName}:${colors.reset}`);

    const monthlyPrice = await getPriceInput(
      tierName,
      "monthly",
      monthlyDefault,
    );
    const yearlyPrice = await getPriceInput(tierName, "yearly", yearlyDefault);

    // Determine if this tier should be marked as popular (middle tier)
    const isPopular = tierNumber === 2;
    const features = tierFeatures[tierNumber] || [];

    try {
      const product = await stripe.products.create({
        name: tierName,
        description: `${tierName} - Update name and description in admin portal`,
        metadata: {
          plan_tier: `tier_${tierNumber}`,
          created_by: "setup-stripe",
          display_order: String(tierNumber),
          features: JSON.stringify(features),
          popular: isPopular ? "true" : "false",
          action_label: "Get Started",
        },
      });

      const monthly = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number.parseFloat(monthlyPrice) * 100),
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { billing_period: "monthly" },
      });

      const yearly = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number.parseFloat(yearlyPrice) * 100),
        currency: "usd",
        recurring: { interval: "year" },
        metadata: { billing_period: "yearly" },
      });

      // Set monthly as default price
      await stripe.products.update(product.id, {
        default_price: monthly.id,
      });

      printSuccess(`Created ${tierName}: ${product.id}`);
      console.log(
        `    ${colors.dim}Monthly: $${monthlyPrice}/mo (${monthly.id})${colors.reset}`,
      );
      console.log(
        `    ${colors.dim}Yearly: $${yearlyPrice}/yr (${yearly.id})${colors.reset}`,
      );

      return {
        name: tierName,
        id: product.id,
        priceIds: [monthly.id, yearly.id],
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      printError(`Failed to create ${tierName}: ${errorMessage}`);
      return null;
    }
  };

  console.log("");
  printInfo("Creating pricing tiers in Stripe...");

  // Tier 1 (required)
  const tier1 = await createTier(1, "19", "190");
  if (tier1) createdProducts.push(tier1);

  // Tier 2 (required)
  const tier2 = await createTier(2, "49", "490");
  if (tier2) createdProducts.push(tier2);

  // Tier 3 (optional)
  console.log("");
  const createTier3 = await confirm({
    message: "Create Tier 3?",
    default: false,
  });

  if (createTier3) {
    const tier3 = await createTier(3, "99", "990");
    if (tier3) createdProducts.push(tier3);
  }

  // Enterprise tier (optional, no price)
  console.log("");
  console.log(
    `  ${colors.dim}Enterprise tier: For custom pricing via email/sales contact.${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}No price is attached - you create custom prices per customer in adminx.${colors.reset}`,
  );

  const createEnterprise = await confirm({
    message: "Create Enterprise tier (contact-based, no default price)?",
    default: true,
  });

  if (createEnterprise) {
    console.log("");
    console.log(`  ${colors.bold}Enterprise:${colors.reset}`);

    // Enterprise features
    const enterpriseFeatures = [
      "Everything in lower tiers",
      "Dedicated account manager",
      "24/7 phone & email support",
      "Unlimited usage",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment option",
    ];

    try {
      const enterpriseProduct = await stripe.products.create({
        name: "Enterprise",
        description:
          "Enterprise tier - Contact us for custom pricing tailored to your needs",
        metadata: {
          plan_tier: "enterprise",
          pricing_type: "contact",
          created_by: "setup-stripe",
          display_order: "10",
          features: JSON.stringify(enterpriseFeatures),
          popular: "false",
          exclusive: "true",
          action_label: "Contact Sales",
        },
      });

      printSuccess(`Created Enterprise tier: ${enterpriseProduct.id}`);
      console.log(
        `    ${colors.dim}No default price - create custom prices per customer in adminx${colors.reset}`,
      );

      createdProducts.push({
        name: "Enterprise",
        id: enterpriseProduct.id,
        priceIds: [],
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      printError(`Failed to create Enterprise tier: ${errorMessage}`);
    }
  }

  return createdProducts;
}

// Step 5: Sync Existing Data
async function syncExistingData(stripe: Stripe): Promise<boolean> {
  printHeader("STEP 5: SYNC EXISTING STRIPE DATA");

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    printWarning("DATABASE_URL not set - skipping data sync");
    return false;
  }

  console.log(
    `  ${colors.dim}This will sync existing products, prices, customers, and subscriptions${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}from your Stripe account to your local database.${colors.reset}`,
  );
  console.log("");

  const syncData = await confirm({
    message: "Sync existing Stripe data to database?",
    default: true,
  });

  if (!syncData) {
    printWarning("Data sync skipped");
    return false;
  }

  try {
    printInfo("Syncing data from Stripe...");

    // Import stripeSync dynamically to avoid initialization issues
    const { StripeSync } = await import("stripe-sync-engine");

    const stripeSync = new StripeSync({
      poolConfig: {
        connectionString: databaseUrl,
        max: 10,
        keepAlive: true,
      },
      schema: process.env.STRIPE_SCHEMA ?? "stripe",
      stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "placeholder",
      autoExpandLists: true,
      backfillRelatedEntities: true,
    });

    const result = await stripeSync.syncBackfill({
      object: "all",
    });

    console.log("");
    printSuccess("Data sync completed!");
    console.log("");
    console.log(`  ${colors.dim}Synced entities:${colors.reset}`);

    if (result.products) {
      console.log(`    Products: ${result.products.synced}`);
    }
    if (result.prices) {
      console.log(`    Prices: ${result.prices.synced}`);
    }
    if (result.customers) {
      console.log(`    Customers: ${result.customers.synced}`);
    }
    if (result.subscriptions) {
      console.log(`    Subscriptions: ${result.subscriptions.synced}`);
    }
    if (result.invoices) {
      console.log(`    Invoices: ${result.invoices.synced}`);
    }

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    printError(`Data sync failed: ${errorMessage}`);
    return false;
  }
}

// Print final summary
function printSummary(result: SetupResult, isLiveMode: boolean) {
  printHeader("SETUP COMPLETE");

  console.log(`  ${colors.bold}Summary:${colors.reset}`);
  console.log("");

  if (result.keysVerified) {
    const modeText = isLiveMode
      ? `${colors.yellow}(LIVE MODE)${colors.reset}`
      : `${colors.green}(Test Mode)${colors.reset}`;
    printSuccess(`API Keys verified ${modeText}`);
  } else {
    printError("API Keys not verified");
  }

  if (result.webhookConfigured) {
    printSuccess("Webhook endpoint configured");
    if (result.webhookSecret) {
      console.log(
        `    ${colors.dim}Secret: ${result.webhookSecret.slice(0, 15)}...${colors.reset}`,
      );
    }
  } else {
    printWarning("Webhook not configured");
  }

  if (result.migrationRan) {
    printSuccess("Database migrations completed");
  } else {
    printWarning("Database migrations skipped");
  }

  if (result.productsCreated.length > 0) {
    printSuccess(`Created ${result.productsCreated.length} products:`);
    for (const product of result.productsCreated) {
      console.log(
        `    ${colors.dim}${product.name}: ${product.id}${colors.reset}`,
      );
    }
  } else {
    printWarning("No products created");
  }

  if (result.dataBackfilled) {
    printSuccess("Existing data synced to database");
  }

  console.log("");
  console.log(`${colors.bold}  Next steps:${colors.reset}`);
  console.log(
    `    1. ${colors.cyan}bun run dev${colors.reset}              - Start development server`,
  );
  console.log(
    `    2. Visit ${colors.cyan}/adminx/stripe/products${colors.reset} - Manage products & pricing`,
  );

  if (!result.webhookConfigured) {
    console.log(
      `    3. Configure webhook at ${colors.cyan}https://dashboard.stripe.com/webhooks${colors.reset}`,
    );
  }

  console.log("");
  console.log(`${colors.bold}  Useful links:${colors.reset}`);
  console.log(
    `    ${colors.dim}Stripe Dashboard:${colors.reset}  ${colors.cyan}https://dashboard.stripe.com${colors.reset}`,
  );
  console.log(
    `    ${colors.dim}Webhook Logs:${colors.reset}      ${colors.cyan}https://dashboard.stripe.com/webhooks${colors.reset}`,
  );
  console.log(
    `    ${colors.dim}API Keys:${colors.reset}          ${colors.cyan}https://dashboard.stripe.com/apikeys${colors.reset}`,
  );
  console.log("");
}

// Main function
async function main() {
  // Welcome message
  console.log("");
  console.log(
    `${colors.bold}${colors.magenta}┌${"─".repeat(58)}┐${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.bold}Stripe Setup Wizard${colors.reset}                                     ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}                                                          ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.dim}Configure Stripe payments for your NextJS app${colors.reset}          ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}└${"─".repeat(58)}┘${colors.reset}`,
  );

  const result: SetupResult = {
    keysVerified: false,
    webhookConfigured: false,
    migrationRan: false,
    productsCreated: [],
    dataBackfilled: false,
  };

  // Step 1: Verify API Keys
  const { valid, isLiveMode, stripe } = await verifyApiKeys();
  result.keysVerified = valid;

  if (!valid || !stripe) {
    console.log("");
    printError("Cannot proceed without valid Stripe API keys.");
    console.log(
      `  ${colors.dim}Add your keys to .env.local and run this script again.${colors.reset}`,
    );
    process.exit(1);
  }

  // Step 2: Configure Webhook
  const webhookResult = await configureWebhook(stripe);
  result.webhookConfigured = webhookResult.configured;
  result.webhookSecret = webhookResult.secret;

  // Step 3: Database Migrations
  result.migrationRan = await runDatabaseMigrations();

  // Step 4: Create Default Products
  result.productsCreated = await createDefaultProducts(stripe);

  // Step 5: Sync Existing Data (only if migrations ran)
  if (result.migrationRan) {
    result.dataBackfilled = await syncExistingData(stripe);
  } else {
    console.log("");
    printWarning("Skipping data sync since database migrations were not run.");
  }

  // Print summary
  printSummary(result, isLiveMode);
}

main().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
    process.exit(0);
  }
  console.error(`\n${colors.red}Setup failed:${colors.reset}`, error.message);
  process.exit(1);
});
