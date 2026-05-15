import { AUTH_PROVIDERS, type AuthProvider } from "../auth-init/types";
import { colors } from "../lib/colors";

export interface CliFlags {
  provider?: AuthProvider;
  yes: boolean;
  force: boolean;
  help: boolean;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): CliFlags {
  const flags: CliFlags = { yes: false, force: false, help: false };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--yes" || arg === "-y" || arg === "--defaults") {
      flags.yes = true;
    } else if (arg === "--force" || arg === "-f") {
      flags.force = true;
    } else if (arg.startsWith("--provider=")) {
      const value = arg.split("=")[1] as AuthProvider;
      if (!AUTH_PROVIDERS.some((entry) => entry.value === value)) {
        console.error(`${colors.red}Unknown provider: ${value}${colors.reset}`);
        console.error(
          `Available: ${AUTH_PROVIDERS.map((entry) => entry.value).join(", ")}`,
        );
        process.exit(1);
      }
      flags.provider = value;
    } else {
      console.error(`${colors.red}Unknown argument: ${arg}${colors.reset}`);
      process.exit(1);
    }
  }

  return flags;
}

export function printHelp(): void {
  console.log(`
${colors.bold}bun run setup${colors.reset} — initialize auth provider and configure .env.local

${colors.bold}Usage:${colors.reset}
  bun run setup                                    Interactive
  bun run setup --yes --provider=better-auth       Headless / CI
  bun run setup --force --provider=clerk --yes     Re-init auth (dangerous)

${colors.bold}Flags:${colors.reset}
  --provider=<name>   Auth provider (better-auth | next-auth | clerk | authkit)
  --yes, -y           Skip all prompts; accept defaults; skip optional services
                      unless their env vars are present
  --force, -f         Re-initialize auth even if already locked
  --help, -h          Show this help

${colors.bold}Env-var overrides (when used with --yes):${colors.reset}
  DATABASE_URL, NEXT_PUBLIC_APP_URL, BETTER_AUTH_SECRET, NEXTAUTH_SECRET,
  GOOGLE_CLIENT_SECRET, WORKOS_API_KEY, WORKOS_CLIENT_ID,
  CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
  RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME,
  ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_EMAIL_DOMAINS
`);
}

export function printBanner(): void {
  console.log("");
  console.log(
    `${colors.bold}${colors.magenta}┌${"─".repeat(58)}┐${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.bold}NextJS Starter Kit — Setup${colors.reset}                              ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}                                                          ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.dim}Auth provider + .env.local in one go${colors.reset}                    ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}└${"─".repeat(58)}┘${colors.reset}`,
  );
}

export const AUTH_PROVIDER_NAMES: Record<string, string> = {
  "better-auth": "Better Auth (self-hosted)",
  "next-auth": "NextAuth (Auth.js v5)",
  authkit: "AuthKit (WorkOS)",
  clerk: "Clerk (managed auth)",
};
