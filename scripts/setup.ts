#!/usr/bin/env tsx
/**
 * Interactive setup script for configuring .env.local
 * Run with: bun run setup
 *
 * NOTE: This script reads from .auth-provider.lock to determine which
 * auth provider to configure. Run `bun run init-auth` first if not done.
 */

import { confirm, input, password, select } from "@inquirer/prompts";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Auth provider types (mapped from lock file values)
const AUTH_PROVIDER_NAMES: Record<string, string> = {
  "better-auth": "Better Auth (self-hosted)",
  "next-auth": "NextAuth (Auth.js v5)",
  authkit: "AuthKit (WorkOS)",
  clerk: "Clerk (managed auth)",
};

type AuthProvider = "better-auth" | "next-auth" | "authkit" | "clerk";

interface LockFile {
  version: string;
  provider: AuthProvider;
  initializedAt: string;
  templateVersion: string;
}

// Read auth provider from lock file
function getAuthProvider(): AuthProvider | null {
  const lockPath = resolve(process.cwd(), ".auth-provider.lock");
  if (!existsSync(lockPath)) {
    return null;
  }
  try {
    const content = readFileSync(lockPath, "utf-8");
    const lock: LockFile = JSON.parse(content);
    return lock.provider;
  } catch (error) {
    console.error("Error reading .auth-provider.lock:", error);
    return null;
  }
}

interface EnvVariable {
  key: string;
  value: string;
  section: string;
}

interface ChangeInfo {
  key: string;
  oldValue: string;
  newValue: string;
}

// Helper: Generate secure random string (base64)
function generateSecret(length = 32): string {
  return randomBytes(length).toString("base64");
}

// Helper: Parse existing .env file into Map
function parseEnvFile(content: string): Map<string, string> {
  const env = new Map<string, string>();
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
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

// Helper: Mask sensitive values for display
function maskValue(value: string, isSecret = false): string {
  if (!value || value.length === 0) return "(empty)";
  if (!isSecret) return value;
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

// Helper: Print section header
function printHeader(text: string) {
  console.log("");
  console.log(`${colors.cyan}${"━".repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${text}${colors.reset}`);
  console.log(`${colors.cyan}${"━".repeat(60)}${colors.reset}`);
  console.log("");
}

// Helper: Print update warning
function printUpdateWarning(key: string, oldValue: string, isSecret = false) {
  const masked = maskValue(oldValue, isSecret);
  console.log(`  ${colors.yellow}Current value: ${masked}${colors.reset}`);
}

// Generate the final .env.local content with sections
function generateEnvContent(variables: EnvVariable[]): string {
  const sections: Record<string, EnvVariable[]> = {};

  for (const v of variables) {
    if (!sections[v.section]) {
      sections[v.section] = [];
    }
    sections[v.section].push(v);
  }

  const sectionOrder = [
    "Database",
    "Authentication Provider",
    "BetterAuth",
    "NextAuth",
    "AuthKit",
    "Clerk",
    "Stripe",
    "Upstash",
    "Email",
    "Admin",
    "Other",
  ];

  let content = "";

  for (const sectionName of sectionOrder) {
    const vars = sections[sectionName];
    if (!vars || vars.length === 0) continue;

    content += `# ${"=".repeat(44)}\n`;
    content += `# ${sectionName}\n`;
    content += `# ${"=".repeat(44)}\n`;

    for (const v of vars) {
      content += `${v.key}=${v.value}\n`;
    }

    content += "\n";
  }

  // Add any remaining sections not in the order
  for (const [sectionName, vars] of Object.entries(sections)) {
    if (sectionOrder.includes(sectionName) || vars.length === 0) continue;

    content += `# ${"=".repeat(44)}\n`;
    content += `# ${sectionName}\n`;
    content += `# ${"=".repeat(44)}\n`;

    for (const v of vars) {
      content += `${v.key}=${v.value}\n`;
    }

    content += "\n";
  }

  return `${content.trim()}\n`;
}

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  let existingEnv: Map<string, string> = new Map();
  let isUpdating = false;
  const changes: ChangeInfo[] = [];
  const newVariables: EnvVariable[] = [];

  // Welcome message
  console.log("");
  console.log(
    `${colors.bold}${colors.magenta}┌${"─".repeat(58)}┐${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.bold}NextJS Starter Kit - Environment Setup${colors.reset}                  ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}                                                          ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.dim}This wizard will help you configure your .env.local${colors.reset}      ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}└${"─".repeat(58)}┘${colors.reset}`,
  );

  // Check for existing .env.local
  if (existsSync(envPath)) {
    console.log("");
    console.log(
      `${colors.yellow}  Found existing .env.local file${colors.reset}`,
    );

    const action = await select({
      message: "What would you like to do?",
      choices: [
        {
          value: "update",
          name: "Update existing (merge new values, preserve others)",
        },
        {
          value: "fresh",
          name: "Start fresh (backup existing file first)",
        },
        { value: "cancel", name: "Cancel setup" },
      ],
    });

    if (action === "cancel") {
      console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
      process.exit(0);
    }

    if (action === "fresh") {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = resolve(
        process.cwd(),
        `.env.local.backup.${timestamp}`,
      );
      copyFileSync(envPath, backupPath);
      console.log(
        `\n${colors.green}  Backed up to: ${backupPath}${colors.reset}`,
      );
    } else {
      isUpdating = true;
      const content = readFileSync(envPath, "utf-8");
      existingEnv = parseEnvFile(content);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DATABASE CONFIGURATION
  // ─────────────────────────────────────────────────────────────────
  printHeader("DATABASE CONFIGURATION");

  console.log(
    `${colors.dim}  Tip: Get a free PostgreSQL database at ${colors.cyan}https://neon.tech${colors.reset}`,
  );
  console.log("");

  const existingDbUrl = existingEnv.get("DATABASE_URL");
  if (existingDbUrl && isUpdating) {
    printUpdateWarning("DATABASE_URL", existingDbUrl);
  }

  const databaseUrl = await input({
    message: "Database URL:",
    default:
      existingDbUrl ||
      "postgresql://postgres:postgres@localhost:5432/nextjs_starter",
  });

  if (isUpdating && existingDbUrl && existingDbUrl !== databaseUrl) {
    changes.push({
      key: "DATABASE_URL",
      oldValue: existingDbUrl,
      newValue: databaseUrl,
    });
  }

  newVariables.push({
    key: "DATABASE_URL",
    value: databaseUrl,
    section: "Database",
  });

  // ─────────────────────────────────────────────────────────────────
  // AUTHENTICATION PROVIDER (from lock file)
  // ─────────────────────────────────────────────────────────────────
  printHeader("AUTHENTICATION PROVIDER");

  // Read auth provider from lock file
  const authProvider = getAuthProvider();

  if (!authProvider) {
    console.log(`${colors.red}  No auth provider initialized!${colors.reset}`);
    console.log("");
    console.log(
      `${colors.yellow}  Please run: ${colors.bold}bun run init-auth${colors.reset}`,
    );
    console.log(
      `${colors.dim}  This will initialize the project with your chosen auth provider.${colors.reset}`,
    );
    console.log("");
    process.exit(1);
  }

  const providerName = AUTH_PROVIDER_NAMES[authProvider] || authProvider;
  console.log(
    `${colors.green}  ✓ Using: ${colors.bold}${providerName}${colors.reset}`,
  );
  console.log(
    `${colors.dim}  (Set by init-auth - this cannot be changed)${colors.reset}`,
  );
  console.log("");

  // App URL
  const existingAppUrl = existingEnv.get("NEXT_PUBLIC_APP_URL");
  if (existingAppUrl && isUpdating) {
    printUpdateWarning("NEXT_PUBLIC_APP_URL", existingAppUrl);
  }

  const appUrl = await input({
    message: "App URL:",
    default: existingAppUrl || "http://localhost:8801",
  });

  if (isUpdating && existingAppUrl && existingAppUrl !== appUrl) {
    changes.push({
      key: "NEXT_PUBLIC_APP_URL",
      oldValue: existingAppUrl,
      newValue: appUrl,
    });
  }

  newVariables.push({
    key: "NEXT_PUBLIC_APP_URL",
    value: appUrl,
    section: "Authentication Provider",
  });

  // ─────────────────────────────────────────────────────────────────
  // PROVIDER-SPECIFIC CONFIGURATION
  // ─────────────────────────────────────────────────────────────────
  if (authProvider === "better-auth") {
    printHeader("BETTERAUTH CONFIGURATION");

    const existingSecret = existingEnv.get("BETTER_AUTH_SECRET");
    const existingUrl = existingEnv.get("BETTER_AUTH_URL");

    let secret: string;
    if (existingSecret && isUpdating) {
      printUpdateWarning("BETTER_AUTH_SECRET", existingSecret, true);
      const regenerate = await confirm({
        message: "Regenerate secret?",
        default: false,
      });
      secret = regenerate ? generateSecret() : existingSecret;
      if (regenerate) {
        changes.push({
          key: "BETTER_AUTH_SECRET",
          oldValue: "(regenerated)",
          newValue: "(new secret)",
        });
      }
    } else {
      console.log(
        `${colors.green}  Auto-generating BETTER_AUTH_SECRET...${colors.reset}`,
      );
      secret = generateSecret();
    }

    newVariables.push({
      key: "BETTER_AUTH_SECRET",
      value: secret,
      section: "BetterAuth",
    });
    newVariables.push({
      key: "BETTER_AUTH_URL",
      value: existingUrl || appUrl,
      section: "BetterAuth",
    });

    // Google OAuth (Optional for Better Auth)
    console.log("");
    const existingGoogleClientId = existingEnv.get(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    );
    const existingGoogleClientSecret = existingEnv.get("GOOGLE_CLIENT_SECRET");
    const hasExistingGoogle = !!(
      existingGoogleClientId && existingGoogleClientSecret
    );

    const configureGoogle = await confirm({
      message: `Configure Google OAuth login?${hasExistingGoogle ? " (existing config found)" : ""}`,
      default: hasExistingGoogle,
    });

    if (configureGoogle) {
      console.log("");
      console.log(
        `${colors.dim}  Get credentials from: ${colors.cyan}https://console.cloud.google.com/apis/credentials${colors.reset}`,
      );
      console.log(
        `${colors.dim}  Add this redirect URI: ${colors.cyan}${appUrl}/api/auth/callback/google${colors.reset}`,
      );
      console.log("");

      if (existingGoogleClientId && isUpdating) {
        printUpdateWarning(
          "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
          existingGoogleClientId,
        );
      }
      const googleClientId = await input({
        message: "Google Client ID:",
        default: existingGoogleClientId || "",
      });

      if (existingGoogleClientSecret && isUpdating) {
        printUpdateWarning(
          "GOOGLE_CLIENT_SECRET",
          existingGoogleClientSecret,
          true,
        );
      }
      const googleClientSecret = await password({
        message: "Google Client Secret:",
        mask: "*",
      });

      if (googleClientId) {
        newVariables.push({
          key: "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
          value: googleClientId,
          section: "BetterAuth",
        });
      }
      if (googleClientSecret || existingGoogleClientSecret) {
        newVariables.push({
          key: "GOOGLE_CLIENT_SECRET",
          value: googleClientSecret || existingGoogleClientSecret || "",
          section: "BetterAuth",
        });
      }
    } else if (hasExistingGoogle && isUpdating) {
      // Preserve existing Google OAuth config
      if (existingGoogleClientId) {
        newVariables.push({
          key: "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
          value: existingGoogleClientId,
          section: "BetterAuth",
        });
      }
      if (existingGoogleClientSecret) {
        newVariables.push({
          key: "GOOGLE_CLIENT_SECRET",
          value: existingGoogleClientSecret,
          section: "BetterAuth",
        });
      }
    }
  } else if (authProvider === "next-auth") {
    printHeader("NEXTAUTH CONFIGURATION");

    const existingSecret = existingEnv.get("NEXTAUTH_SECRET");
    const existingUrl = existingEnv.get("NEXTAUTH_URL");

    let secret: string;
    if (existingSecret && isUpdating) {
      printUpdateWarning("NEXTAUTH_SECRET", existingSecret, true);
      const regenerate = await confirm({
        message: "Regenerate secret?",
        default: false,
      });
      secret = regenerate ? generateSecret() : existingSecret;
      if (regenerate) {
        changes.push({
          key: "NEXTAUTH_SECRET",
          oldValue: "(regenerated)",
          newValue: "(new secret)",
        });
      }
    } else {
      console.log(
        `${colors.green}  Auto-generating NEXTAUTH_SECRET...${colors.reset}`,
      );
      secret = generateSecret();
    }

    newVariables.push({
      key: "NEXTAUTH_SECRET",
      value: secret,
      section: "NextAuth",
    });
    newVariables.push({
      key: "NEXTAUTH_URL",
      value: existingUrl || appUrl,
      section: "NextAuth",
    });
  } else if (authProvider === "authkit") {
    printHeader("AUTHKIT (WORKOS) CONFIGURATION");

    console.log(
      `${colors.dim}  Get credentials from: ${colors.cyan}https://workos.com${colors.reset}`,
    );
    console.log("");

    const existingApiKey = existingEnv.get("WORKOS_API_KEY");
    const existingClientId = existingEnv.get("WORKOS_CLIENT_ID");
    const existingCookiePassword = existingEnv.get("WORKOS_COOKIE_PASSWORD");
    const existingRedirectUri = existingEnv.get(
      "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
    );

    if (existingApiKey && isUpdating) {
      printUpdateWarning("WORKOS_API_KEY", existingApiKey, true);
    }
    const apiKey = await password({
      message: "WorkOS API Key (sk_xxx):",
      mask: "*",
    });

    if (existingClientId && isUpdating) {
      printUpdateWarning("WORKOS_CLIENT_ID", existingClientId);
    }
    const clientId = await input({
      message: "WorkOS Client ID (client_xxx):",
      default: existingClientId || "",
    });

    let cookiePassword: string;
    if (existingCookiePassword && isUpdating) {
      printUpdateWarning(
        "WORKOS_COOKIE_PASSWORD",
        existingCookiePassword,
        true,
      );
      const regenerate = await confirm({
        message: "Regenerate cookie password?",
        default: false,
      });
      cookiePassword = regenerate ? generateSecret() : existingCookiePassword;
    } else {
      console.log(
        `${colors.green}  Auto-generating WORKOS_COOKIE_PASSWORD...${colors.reset}`,
      );
      cookiePassword = generateSecret();
    }

    const redirectUri = existingRedirectUri || `${appUrl}/api/auth/callback`;

    newVariables.push({
      key: "WORKOS_API_KEY",
      value: apiKey || existingApiKey || "",
      section: "AuthKit",
    });
    newVariables.push({
      key: "WORKOS_CLIENT_ID",
      value: clientId,
      section: "AuthKit",
    });
    newVariables.push({
      key: "WORKOS_COOKIE_PASSWORD",
      value: cookiePassword,
      section: "AuthKit",
    });
    newVariables.push({
      key: "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
      value: redirectUri,
      section: "AuthKit",
    });
  } else if (authProvider === "clerk") {
    printHeader("CLERK CONFIGURATION");

    console.log(
      `${colors.dim}  Get credentials from: ${colors.cyan}https://clerk.com${colors.reset}`,
    );
    console.log("");

    const existingPublishableKey = existingEnv.get(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    );
    const existingSecretKey = existingEnv.get("CLERK_SECRET_KEY");

    if (existingPublishableKey && isUpdating) {
      printUpdateWarning(
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        existingPublishableKey,
      );
    }
    const publishableKey = await input({
      message: "Clerk Publishable Key (pk_test_xxx):",
      default: existingPublishableKey || "",
    });

    if (existingSecretKey && isUpdating) {
      printUpdateWarning("CLERK_SECRET_KEY", existingSecretKey, true);
    }
    const secretKey = await password({
      message: "Clerk Secret Key (sk_test_xxx):",
      mask: "*",
    });

    newVariables.push({
      key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      value: publishableKey,
      section: "Clerk",
    });
    newVariables.push({
      key: "CLERK_SECRET_KEY",
      value: secretKey || existingSecretKey || "",
      section: "Clerk",
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // OPTIONAL SERVICES
  // ─────────────────────────────────────────────────────────────────
  printHeader("OPTIONAL SERVICES");

  // Stripe
  const existingStripeKey = existingEnv.get("STRIPE_SECRET_KEY");
  const existingStripeWebhook = existingEnv.get("STRIPE_WEBHOOK_SECRET");
  const hasExistingStripe = !!(existingStripeKey || existingStripeWebhook);

  const configureStripe = await confirm({
    message: `Configure Stripe payments?${hasExistingStripe ? " (existing config found)" : ""}`,
    default: hasExistingStripe,
  });

  if (configureStripe) {
    console.log("");
    if (existingStripeKey && isUpdating) {
      printUpdateWarning("STRIPE_SECRET_KEY", existingStripeKey, true);
    }
    const stripeKey = await password({
      message: "Stripe Secret Key (sk_xxx):",
      mask: "*",
    });

    if (existingStripeWebhook && isUpdating) {
      printUpdateWarning("STRIPE_WEBHOOK_SECRET", existingStripeWebhook, true);
    }
    const stripeWebhook = await password({
      message: "Stripe Webhook Secret (whsec_xxx):",
      mask: "*",
    });

    newVariables.push({
      key: "STRIPE_SECRET_KEY",
      value: stripeKey || existingStripeKey || "",
      section: "Stripe",
    });
    newVariables.push({
      key: "STRIPE_WEBHOOK_SECRET",
      value: stripeWebhook || existingStripeWebhook || "",
      section: "Stripe",
    });
  } else if (hasExistingStripe && isUpdating) {
    // Preserve existing Stripe config
    if (existingStripeKey) {
      newVariables.push({
        key: "STRIPE_SECRET_KEY",
        value: existingStripeKey,
        section: "Stripe",
      });
    }
    if (existingStripeWebhook) {
      newVariables.push({
        key: "STRIPE_WEBHOOK_SECRET",
        value: existingStripeWebhook,
        section: "Stripe",
      });
    }
  }

  // Upstash
  const existingUpstashUrl = existingEnv.get("UPSTASH_REDIS_REST_URL");
  const existingUpstashToken = existingEnv.get("UPSTASH_REDIS_REST_TOKEN");
  const hasExistingUpstash = !!(existingUpstashUrl || existingUpstashToken);

  console.log("");
  const configureUpstash = await confirm({
    message: `Configure Upstash Redis (rate limiting & caching)?${hasExistingUpstash ? " (existing config found)" : ""}`,
    default: hasExistingUpstash,
  });

  if (configureUpstash) {
    console.log("");
    console.log(
      `${colors.dim}  Get credentials from: ${colors.cyan}https://upstash.com${colors.reset}`,
    );
    console.log("");

    if (existingUpstashUrl && isUpdating) {
      printUpdateWarning("UPSTASH_REDIS_REST_URL", existingUpstashUrl);
    }
    const upstashUrl = await input({
      message: "Upstash Redis REST URL:",
      default: existingUpstashUrl || "",
    });

    if (existingUpstashToken && isUpdating) {
      printUpdateWarning(
        "UPSTASH_REDIS_REST_TOKEN",
        existingUpstashToken,
        true,
      );
    }
    const upstashToken = await password({
      message: "Upstash Redis REST Token:",
      mask: "*",
    });

    newVariables.push({
      key: "UPSTASH_REDIS_REST_URL",
      value: upstashUrl,
      section: "Upstash",
    });
    newVariables.push({
      key: "UPSTASH_REDIS_REST_TOKEN",
      value: upstashToken || existingUpstashToken || "",
      section: "Upstash",
    });
  } else if (hasExistingUpstash && isUpdating) {
    // Preserve existing Upstash config
    if (existingUpstashUrl) {
      newVariables.push({
        key: "UPSTASH_REDIS_REST_URL",
        value: existingUpstashUrl,
        section: "Upstash",
      });
    }
    if (existingUpstashToken) {
      newVariables.push({
        key: "UPSTASH_REDIS_REST_TOKEN",
        value: existingUpstashToken,
        section: "Upstash",
      });
    }
  }

  // Resend Email
  const existingResendApiKey = existingEnv.get("RESEND_API_KEY");
  const existingResendFromEmail = existingEnv.get("RESEND_FROM_EMAIL");
  const existingResendFromName = existingEnv.get("RESEND_FROM_NAME");
  const hasExistingResend = !!(existingResendApiKey || existingResendFromEmail);

  console.log("");
  const configureResend = await confirm({
    message: `Configure Resend email provider (for password reset emails)?${hasExistingResend ? " (existing config found)" : ""}`,
    default: hasExistingResend,
  });

  if (configureResend) {
    console.log("");
    console.log(
      `${colors.dim}  Get API key from: ${colors.cyan}https://resend.com${colors.reset}`,
    );
    console.log(
      `${colors.dim}  If not configured, password reset codes will print to console.${colors.reset}`,
    );
    console.log("");

    if (existingResendApiKey && isUpdating) {
      printUpdateWarning("RESEND_API_KEY", existingResendApiKey, true);
    }
    const resendApiKey = await password({
      message: "Resend API Key (re_xxx):",
      mask: "*",
    });

    if (existingResendFromEmail && isUpdating) {
      printUpdateWarning("RESEND_FROM_EMAIL", existingResendFromEmail);
    }
    const resendFromEmail = await input({
      message: "From email address:",
      default: existingResendFromEmail || "noreply@yourdomain.com",
    });

    if (existingResendFromName && isUpdating) {
      printUpdateWarning("RESEND_FROM_NAME", existingResendFromName);
    }
    const resendFromName = await input({
      message: "From name (appears in email):",
      default: existingResendFromName || "Your App",
    });

    newVariables.push({
      key: "RESEND_API_KEY",
      value: resendApiKey || existingResendApiKey || "",
      section: "Email",
    });
    newVariables.push({
      key: "RESEND_FROM_EMAIL",
      value: resendFromEmail,
      section: "Email",
    });
    newVariables.push({
      key: "RESEND_FROM_NAME",
      value: resendFromName,
      section: "Email",
    });
  } else if (hasExistingResend && isUpdating) {
    // Preserve existing Resend config
    if (existingResendApiKey) {
      newVariables.push({
        key: "RESEND_API_KEY",
        value: existingResendApiKey,
        section: "Email",
      });
    }
    if (existingResendFromEmail) {
      newVariables.push({
        key: "RESEND_FROM_EMAIL",
        value: existingResendFromEmail,
        section: "Email",
      });
    }
    if (existingResendFromName) {
      newVariables.push({
        key: "RESEND_FROM_NAME",
        value: existingResendFromName,
        section: "Email",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // ADMIN USER CONFIGURATION
  // ─────────────────────────────────────────────────────────────────
  printHeader("ADMIN USER (Optional)");

  console.log(
    `${colors.dim}  The admin portal (/adminx) requires a user with 'site-admin' role.${colors.reset}`,
  );
  console.log(
    `${colors.dim}  You can create an initial admin user here.${colors.reset}`,
  );
  console.log("");

  const existingAdminName = existingEnv.get("ADMIN_NAME");
  const existingAdminEmail = existingEnv.get("ADMIN_EMAIL");
  const existingAdminPassword = existingEnv.get("ADMIN_PASSWORD");
  const existingAdminDomains = existingEnv.get("ADMIN_EMAIL_DOMAINS");
  const hasExistingAdmin = !!(existingAdminEmail && existingAdminPassword);

  const configureAdmin = await confirm({
    message: `Create an admin user?${hasExistingAdmin ? " (existing config found)" : ""}`,
    default: !hasExistingAdmin,
  });

  if (configureAdmin) {
    console.log("");

    if (existingAdminName && isUpdating) {
      printUpdateWarning("ADMIN_NAME", existingAdminName);
    }
    const adminName = await input({
      message: "Admin name:",
      default: existingAdminName || "",
      validate: (value) => {
        if (!value.trim()) return "Name is required";
        return true;
      },
    });

    if (existingAdminEmail && isUpdating) {
      printUpdateWarning("ADMIN_EMAIL", existingAdminEmail);
    }
    const adminEmail = await input({
      message: "Admin email:",
      default: existingAdminEmail || "",
      validate: (value) => {
        if (!value.trim()) return "Email is required";
        if (!value.includes("@")) return "Invalid email format";
        return true;
      },
    });

    if (existingAdminPassword && isUpdating) {
      printUpdateWarning("ADMIN_PASSWORD", existingAdminPassword, true);
    }
    const adminPassword = await password({
      message: "Admin password:",
      mask: "*",
      validate: (value) => {
        if (!value || value.length < 8)
          return "Password must be at least 8 characters";
        return true;
      },
    });

    const confirmPassword = await password({
      message: "Confirm password:",
      mask: "*",
      validate: (value) => {
        if (value !== adminPassword) return "Passwords do not match";
        return true;
      },
    });

    if (confirmPassword === adminPassword) {
      newVariables.push({
        key: "ADMIN_NAME",
        value: adminName,
        section: "Admin",
      });
      newVariables.push({
        key: "ADMIN_EMAIL",
        value: adminEmail,
        section: "Admin",
      });
      newVariables.push({
        key: "ADMIN_PASSWORD",
        value: adminPassword,
        section: "Admin",
      });

      console.log("");
      console.log(
        `${colors.green}  Admin credentials saved. Run 'bun run db:seed' after 'db:push' to create the user.${colors.reset}`,
      );
    }
  } else if (hasExistingAdmin && isUpdating) {
    // Preserve existing admin config
    if (existingAdminName) {
      newVariables.push({
        key: "ADMIN_NAME",
        value: existingAdminName,
        section: "Admin",
      });
    }
    if (existingAdminEmail) {
      newVariables.push({
        key: "ADMIN_EMAIL",
        value: existingAdminEmail,
        section: "Admin",
      });
    }
    if (existingAdminPassword) {
      newVariables.push({
        key: "ADMIN_PASSWORD",
        value: existingAdminPassword,
        section: "Admin",
      });
    }
  }

  // Admin email domains (optional - for auto-promoting users)
  console.log("");
  const configureAdminDomains = await confirm({
    message: `Auto-promote users from specific email domains to admin?${existingAdminDomains ? " (existing config found)" : ""}`,
    default: !!existingAdminDomains,
  });

  if (configureAdminDomains) {
    console.log("");
    console.log(
      `${colors.dim}  Users signing up with these email domains will automatically become admins.${colors.reset}`,
    );
    console.log("");

    if (existingAdminDomains && isUpdating) {
      printUpdateWarning("ADMIN_EMAIL_DOMAINS", existingAdminDomains);
    }
    const adminDomains = await input({
      message: "Enter domains (comma-separated, e.g., mycompany.com,team.io):",
      default: existingAdminDomains || "",
    });

    if (adminDomains.trim()) {
      newVariables.push({
        key: "ADMIN_EMAIL_DOMAINS",
        value: adminDomains
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean)
          .join(","),
        section: "Admin",
      });
    }
  } else if (existingAdminDomains && isUpdating) {
    newVariables.push({
      key: "ADMIN_EMAIL_DOMAINS",
      value: existingAdminDomains,
      section: "Admin",
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PRESERVE OTHER EXISTING VARIABLES
  // ─────────────────────────────────────────────────────────────────
  if (isUpdating) {
    const configuredKeys = new Set(newVariables.map((v) => v.key));
    existingEnv.forEach((value, key) => {
      if (!configuredKeys.has(key)) {
        newVariables.push({
          key,
          value,
          section: "Other",
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  printHeader("SUMMARY");

  console.log(`  ${colors.bold}Variables to be written:${colors.reset}`);
  console.log("");

  const secretKeys = [
    "BETTER_AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_SECRET",
    "WORKOS_API_KEY",
    "WORKOS_COOKIE_PASSWORD",
    "CLERK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "UPSTASH_REDIS_REST_TOKEN",
    "RESEND_API_KEY",
    "ADMIN_PASSWORD",
  ];

  for (const v of newVariables) {
    const isSecret = secretKeys.includes(v.key);
    const displayValue = maskValue(v.value, isSecret);
    const change = changes.find((c) => c.key === v.key);

    if (change) {
      console.log(
        `  ${colors.yellow}⚡${colors.reset} ${v.key} ${colors.dim}(updated)${colors.reset}`,
      );
    } else {
      console.log(
        `  ${colors.green}✓${colors.reset} ${v.key} = ${colors.dim}${displayValue}${colors.reset}`,
      );
    }
  }

  if (changes.length > 0) {
    console.log("");
    console.log(
      `  ${colors.yellow}${changes.length} variable(s) will be updated${colors.reset}`,
    );
  }

  console.log("");

  const shouldWrite = await confirm({
    message: "Write .env.local?",
    default: true,
  });

  if (!shouldWrite) {
    console.log(
      `\n${colors.dim}Setup cancelled. No files were modified.${colors.reset}`,
    );
    process.exit(0);
  }

  // Write the file
  const content = generateEnvContent(newVariables);
  writeFileSync(envPath, content, "utf-8");

  console.log("");
  console.log(
    `${colors.green}${colors.bold}  ✅ Successfully wrote .env.local${colors.reset}`,
  );
  console.log("");
  console.log(`${colors.bold}  Next steps:${colors.reset}`);
  console.log(
    `    1. ${colors.cyan}bun run db:push${colors.reset}    - Sync database schema`,
  );
  console.log(
    `    2. ${colors.cyan}bun run db:seed${colors.reset}    - Create admin user (if configured)`,
  );
  console.log(
    `    3. ${colors.cyan}bun run dev${colors.reset}        - Start development server`,
  );
  console.log("");
  console.log(`${colors.bold}  Available routes:${colors.reset}`);
  console.log(
    `    ${colors.dim}http://localhost:8801${colors.reset}          - Home page`,
  );
  console.log(
    `    ${colors.dim}http://localhost:8801/dashboard${colors.reset} - User dashboard`,
  );
  console.log(
    `    ${colors.dim}http://localhost:8801/adminx${colors.reset}    - Admin portal (requires site-admin role)`,
  );
  console.log("");
}

main().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
    process.exit(0);
  }
  console.error("Setup failed:", error);
  process.exit(1);
});
