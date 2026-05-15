import { colors } from "../../scripts/lib/colors";
import { printHeader } from "../../scripts/lib/log";
import { confirm, input, password, select } from "../../scripts/lib/prompts";
import { teardownObjectStorage } from "./teardown-object-storage";
import type { SetupVariableContext } from "./types";

interface OptionalConfigParams extends SetupVariableContext {
  printUpdateWarning: (
    key: string,
    oldValue: string,
    isSecret?: boolean,
  ) => void;
}

export async function configureOptionalAndAdminVariables(
  params: OptionalConfigParams,
) {
  const { existingEnv, isUpdating, newVariables, printUpdateWarning } = params;

  printHeader("OPTIONAL SERVICES");

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

  // ── Object Storage ───────────────────────────────────────────────────────────

  const existingStorageProvider = existingEnv.get("OBJECT_STORAGE_PROVIDER");
  const hasExistingStorage = !!existingStorageProvider;

  console.log("");
  const configureStorage = await confirm({
    message: `Configure object storage (file uploads)?${hasExistingStorage ? " (existing config found)" : ""}`,
    default: hasExistingStorage,
  });

  if (configureStorage) {
    console.log("");
    const storageProvider = await select<string>({
      message: "Object storage provider:",
      choices: [
        { value: "vercel-blob", name: "Vercel Blob (recommended)" },
        { value: "s3", name: "Custom S3-compatible (AWS, R2, MinIO, etc.)" },
      ],
    });

    if (storageProvider === "vercel-blob") {
      console.log("");
      console.log(
        `${colors.dim}  Get your token from: ${colors.cyan}https://vercel.com/dashboard → Storage → Blob${colors.reset}`,
      );
      console.log("");

      const existingBlobToken = existingEnv.get("BLOB_READ_WRITE_TOKEN");
      if (existingBlobToken && isUpdating) {
        printUpdateWarning("BLOB_READ_WRITE_TOKEN", existingBlobToken, true);
      }
      const blobToken = await password({
        message: "Vercel Blob read-write token:",
        mask: "*",
      });

      newVariables.push({
        key: "OBJECT_STORAGE_PROVIDER",
        value: "vercel-blob",
        section: "Object Storage",
      });
      newVariables.push({
        key: "BLOB_READ_WRITE_TOKEN",
        value: blobToken || existingBlobToken || "",
        section: "Object Storage",
      });
    } else {
      console.log("");
      console.log(
        `${colors.dim}  Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2, and any S3-compatible endpoint.${colors.reset}`,
      );
      console.log("");

      const existingEndpoint = existingEnv.get("S3_ENDPOINT");
      if (existingEndpoint && isUpdating)
        printUpdateWarning("S3_ENDPOINT", existingEndpoint);
      const s3Endpoint = await input({
        message: "S3 endpoint URL (e.g. https://s3.amazonaws.com or R2 URL):",
        default: existingEndpoint || "",
        validate: (v) => (v.trim() ? true : "Endpoint is required"),
      });

      const existingRegion = existingEnv.get("S3_REGION");
      if (existingRegion && isUpdating)
        printUpdateWarning("S3_REGION", existingRegion);
      const s3Region = await input({
        message: "Region (e.g. us-east-1):",
        default: existingRegion || "us-east-1",
        validate: (v) => (v.trim() ? true : "Region is required"),
      });

      const existingAccessKey = existingEnv.get("S3_ACCESS_KEY_ID");
      if (existingAccessKey && isUpdating)
        printUpdateWarning("S3_ACCESS_KEY_ID", existingAccessKey, true);
      const s3AccessKey = await input({
        message: "Access Key ID:",
        default: existingAccessKey || "",
        validate: (v) => (v.trim() ? true : "Access Key ID is required"),
      });

      const existingSecretKey = existingEnv.get("S3_SECRET_ACCESS_KEY");
      if (existingSecretKey && isUpdating)
        printUpdateWarning("S3_SECRET_ACCESS_KEY", existingSecretKey, true);
      const s3SecretKey = await password({
        message: "Secret Access Key:",
        mask: "*",
        validate: (v) =>
          !v || v.trim().length === 0 ? "Secret Access Key is required" : true,
      });

      const existingBucket = existingEnv.get("S3_BUCKET");
      if (existingBucket && isUpdating)
        printUpdateWarning("S3_BUCKET", existingBucket);
      const s3Bucket = await input({
        message: "Bucket name:",
        default: existingBucket || "",
        validate: (v) => (v.trim() ? true : "Bucket name is required"),
      });

      // Live connectivity test
      console.log("");
      console.log(`${colors.dim}  Verifying S3 credentials…${colors.reset}`);
      try {
        // Set env temporarily so validateS3Connection can read them
        process.env.S3_ENDPOINT = s3Endpoint;
        process.env.S3_REGION = s3Region;
        process.env.S3_ACCESS_KEY_ID = s3AccessKey;
        process.env.S3_SECRET_ACCESS_KEY =
          s3SecretKey || existingSecretKey || "";
        process.env.S3_BUCKET = s3Bucket;

        const { validateS3Connection } = await import(
          "../../packages/object-storage/src/providers/s3"
        );
        await validateS3Connection();
        console.log(`${colors.green}  ✓ S3 connection verified${colors.reset}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(
          `${colors.red}  ✗ S3 connection failed: ${msg}${colors.reset}`,
        );
        console.log(
          `${colors.dim}  Check your credentials and try again. Saving anyway.${colors.reset}`,
        );
      }
      console.log("");

      newVariables.push({
        key: "OBJECT_STORAGE_PROVIDER",
        value: "s3",
        section: "Object Storage",
      });
      newVariables.push({
        key: "S3_ENDPOINT",
        value: s3Endpoint,
        section: "Object Storage",
      });
      newVariables.push({
        key: "S3_REGION",
        value: s3Region,
        section: "Object Storage",
      });
      newVariables.push({
        key: "S3_ACCESS_KEY_ID",
        value: s3AccessKey,
        section: "Object Storage",
      });
      newVariables.push({
        key: "S3_SECRET_ACCESS_KEY",
        value: s3SecretKey || existingSecretKey || "",
        section: "Object Storage",
      });
      newVariables.push({
        key: "S3_BUCKET",
        value: s3Bucket,
        section: "Object Storage",
      });
    }
  } else if (hasExistingStorage && isUpdating) {
    // Preserve existing object storage config when skipping
    for (const key of [
      "OBJECT_STORAGE_PROVIDER",
      "BLOB_READ_WRITE_TOKEN",
      "S3_ENDPOINT",
      "S3_REGION",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
      "S3_BUCKET",
    ]) {
      const val = existingEnv.get(key);
      if (val)
        newVariables.push({ key, value: val, section: "Object Storage" });
    }
  } else if (!configureStorage && !isUpdating) {
    teardownObjectStorage(process.cwd());
  }

  // ── Resend ───────────────────────────────────────────────────────────────────

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
    default: hasExistingAdmin,
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
          .map((domain) => domain.trim().toLowerCase())
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
}
