import { colors } from "../../scripts/lib/colors";
import { printHeader } from "../../scripts/lib/log";
import { confirm, input, password } from "../../scripts/lib/prompts";
import type { AuthProvider, SetupVariableContext } from "./types";

interface ProviderConfigParams extends SetupVariableContext {
  authProvider: AuthProvider;
  appUrl: string;
  generateSecret: (length?: number) => string;
  printUpdateWarning: (
    key: string,
    oldValue: string,
    isSecret?: boolean,
  ) => void;
}

export async function configureProviderSpecificVariables(
  params: ProviderConfigParams,
) {
  const {
    authProvider,
    appUrl,
    existingEnv,
    isUpdating,
    newVariables,
    changes,
    generateSecret,
    printUpdateWarning,
  } = params;

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
}
