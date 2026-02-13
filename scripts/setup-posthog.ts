#!/usr/bin/env tsx
/**
 * Interactive PostHog Setup Script
 * Run with: bun run setup:posthog
 *
 * This script helps you:
 * 1. Verify PostHog API credentials
 * 2. Configure email service settings
 * 3. Create event actions in PostHog
 * 4. Set up email workflows (Data Pipelines)
 * 5. Test the integration
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { confirm, input, select } from "@inquirer/prompts";
import { config } from "dotenv";
import {
  WORKFLOW_DEFINITIONS,
  EMAIL_TEMPLATES,
  type WorkflowDefinition,
  type EmailTemplate,
} from "./posthog-workflows";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

// ============================================================================
// ANSI Color Codes
// ============================================================================

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

// ============================================================================
// Types
// ============================================================================

interface SetupResult {
  credentialsVerified: boolean;
  projectId?: string;
  projectName?: string;
  actionsCreated: string[];
  workflowsCreated: string[];
  emailTemplatesCreated: string[];
  envUpdated: boolean;
}

interface PostHogProject {
  id: number;
  name: string;
  organization: string;
}

interface PostHogAction {
  id: number;
  name: string;
  description?: string;
  steps: Array<{
    event: string;
    selector?: string | null;
    url?: string | null;
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function printHeader(text: string) {
  console.log("");
  console.log(`${colors.cyan}${"━".repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${text}${colors.reset}`);
  console.log(`${colors.cyan}${"━".repeat(60)}${colors.reset}`);
  console.log("");
}

function printSuccess(text: string) {
  console.log(`  ${colors.green}✓${colors.reset} ${text}`);
}

function printError(text: string) {
  console.log(`  ${colors.red}✗${colors.reset} ${text}`);
}

function printWarning(text: string) {
  console.log(`  ${colors.yellow}⚠${colors.reset} ${text}`);
}

function printInfo(text: string) {
  console.log(`  ${colors.blue}ℹ${colors.reset} ${text}`);
}

function printStep(step: number, total: number, text: string) {
  console.log(`  ${colors.dim}[${step}/${total}]${colors.reset} ${text}`);
}

// Parse existing .env file into Map
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

// Update .env.local file with new values
function updateEnvFile(updates: Record<string, string>): void {
  const envPath = resolve(process.cwd(), ".env.local");
  let content = "";

  if (existsSync(envPath)) {
    content = readFileSync(envPath, "utf-8");
  }

  const existingEnv = parseEnvFile(content);

  for (const [key, value] of Object.entries(updates)) {
    if (existingEnv.has(key)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      content = content.replace(regex, `${key}=${value}`);
    } else {
      const posthogSection = content.indexOf("# PostHog");
      if (posthogSection !== -1) {
        const nextSection = content.indexOf("\n# ", posthogSection + 1);
        const insertPos = nextSection !== -1 ? nextSection : content.length;
        content = `${content.slice(0, insertPos)}${key}=${value}\n${content.slice(insertPos)}`;
      } else {
        content += `\n# ${"=".repeat(44)}\n# PostHog Analytics\n# ${"=".repeat(44)}\n${key}=${value}\n`;
      }
    }
  }

  writeFileSync(envPath, content, "utf-8");
}

// ============================================================================
// PostHog API Functions
// ============================================================================

async function fetchPostHog(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = "https://app.posthog.com";
  const url = `${baseUrl}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

async function getProjectInfo(apiKey: string): Promise<PostHogProject | null> {
  try {
    const response = await fetchPostHog("/api/projects/", apiKey);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const results = data.results || data;

    if (Array.isArray(results) && results.length > 0) {
      return results[0] as PostHogProject;
    }

    return null;
  } catch {
    return null;
  }
}

async function createAction(
  apiKey: string,
  projectId: number,
  name: string,
  eventName: string,
  description?: string,
): Promise<PostHogAction | null> {
  try {
    const response = await fetchPostHog(
      `/api/projects/${projectId}/actions/`,
      apiKey,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          steps: [
            {
              event: eventName,
              selector: null,
              url: null,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create action: ${error}`);
      return null;
    }

    return (await response.json()) as PostHogAction;
  } catch (error) {
    console.error("Error creating action:", error);
    return null;
  }
}

async function getExistingActions(
  apiKey: string,
  projectId: number,
): Promise<PostHogAction[]> {
  try {
    const response = await fetchPostHog(
      `/api/projects/${projectId}/actions/`,
      apiKey,
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.results || data) as PostHogAction[];
  } catch {
    return [];
  }
}

// ============================================================================
// Step 1: Verify PostHog Credentials
// ============================================================================

async function verifyCredentials(): Promise<{
  valid: boolean;
  project: PostHogProject | null;
  apiKey: string;
}> {
  printHeader("STEP 1: VERIFY POSTHOG CREDENTIALS");

  let apiKey = process.env.POSTHOG_PERSONAL_API_KEY || "";
  const publicKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";

  // Check for public key
  if (publicKey) {
    printSuccess(
      `NEXT_PUBLIC_POSTHOG_KEY: ${publicKey.slice(0, 10)}...${publicKey.slice(-4)}`,
    );
  } else {
    printWarning("NEXT_PUBLIC_POSTHOG_KEY is not set");
    const key = await input({
      message: "Enter your PostHog Project API Key (starts with phc_):",
      validate: (val) => {
        if (!val.startsWith("phc_")) {
          return "Project API key should start with phc_";
        }
        return true;
      },
    });
    updateEnvFile({ NEXT_PUBLIC_POSTHOG_KEY: key });
    printSuccess("Saved NEXT_PUBLIC_POSTHOG_KEY to .env.local");
  }

  // Check for personal API key (needed for API calls)
  if (!apiKey) {
    console.log("");
    printInfo(
      "A Personal API key is required to create actions and workflows programmatically.",
    );
    console.log(
      `  ${colors.dim}Get your Personal API Key from: ${colors.cyan}https://app.posthog.com/settings/user-api-keys${colors.reset}`,
    );
    console.log("");

    apiKey = await input({
      message: "Enter your PostHog Personal API Key (starts with phx_):",
      validate: (val) => {
        if (!val.startsWith("phx_")) {
          return "Personal API key should start with phx_";
        }
        return true;
      },
    });

    updateEnvFile({ POSTHOG_PERSONAL_API_KEY: apiKey });
    printSuccess("Saved POSTHOG_PERSONAL_API_KEY to .env.local");
  } else {
    printSuccess(
      `POSTHOG_PERSONAL_API_KEY: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`,
    );
  }

  // Test API connection
  console.log("");
  printInfo("Testing PostHog API connection...");

  const project = await getProjectInfo(apiKey);

  if (project) {
    printSuccess(`Connected to PostHog project: ${project.name}`);
    console.log(`  ${colors.dim}Project ID: ${project.id}${colors.reset}`);
    updateEnvFile({ POSTHOG_PROJECT_ID: String(project.id) });
    return { valid: true, project, apiKey };
  }

  printError("Failed to connect to PostHog API");
  printInfo("Check that your Personal API Key has the correct permissions");
  return { valid: false, project: null, apiKey };
}

// ============================================================================
// Step 2: Configure App Settings
// ============================================================================

async function configureAppSettings(): Promise<Record<string, string>> {
  printHeader("STEP 2: CONFIGURE APP SETTINGS");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (await input({
      message: "Enter your application URL:",
      default: "http://localhost:8801",
    }));

  const appName =
    process.env.NEXT_PUBLIC_APP_NAME ||
    (await input({
      message: "Enter your application name:",
      default: "My App",
    }));

  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    (await input({
      message: "Enter your support email:",
      default: "support@example.com",
    }));

  const settings = {
    NEXT_PUBLIC_APP_URL: appUrl,
    NEXT_PUBLIC_APP_NAME: appName,
    SUPPORT_EMAIL: supportEmail,
  };

  printSuccess(`App URL: ${appUrl}`);
  printSuccess(`App Name: ${appName}`);
  printSuccess(`Support Email: ${supportEmail}`);

  const saveSettings = await confirm({
    message: "Save these settings to .env.local?",
    default: true,
  });

  if (saveSettings) {
    updateEnvFile(settings);
    printSuccess("Settings saved to .env.local");
  }

  return settings;
}

// ============================================================================
// Step 3: Create Event Actions
// ============================================================================

async function createEventActions(
  apiKey: string,
  projectId: number,
): Promise<string[]> {
  printHeader("STEP 3: CREATE EVENT ACTIONS");

  const eventDefinitions = [
    {
      name: "User Created",
      event: "user.created",
      description: "Triggered when a new user signs up",
    },
    {
      name: "User Verified",
      event: "user.verified",
      description: "Triggered when a user verifies their email",
    },
    {
      name: "User Logged In",
      event: "user.logged_in",
      description: "Triggered when a user logs in",
    },
    {
      name: "User Checked Pricing",
      event: "user.checked_pricing",
      description: "Triggered when a user views the pricing page",
    },
    {
      name: "User Trial Started",
      event: "user.trial_started",
      description: "Triggered when a user starts a trial",
    },
    {
      name: "User Subscription Created",
      event: "user.subscription_created",
      description: "Triggered when a user subscribes to a paid plan",
    },
    {
      name: "User Subscription Cancelled",
      event: "user.subscription_cancelled",
      description: "Triggered when a user cancels their subscription",
    },
  ];

  console.log(
    `  ${colors.dim}Events to create as Actions in PostHog:${colors.reset}`,
  );
  for (const def of eventDefinitions) {
    console.log(`    ${colors.cyan}${def.event}${colors.reset} - ${def.name}`);
  }
  console.log("");

  const createActions = await confirm({
    message: "Create these event actions in PostHog?",
    default: true,
  });

  if (!createActions) {
    printWarning("Action creation skipped");
    return [];
  }

  // Get existing actions to avoid duplicates
  printInfo("Checking for existing actions...");
  const existingActions = await getExistingActions(apiKey, projectId);
  const existingEventNames = new Set(
    existingActions.flatMap((a) => a.steps.map((s) => s.event)),
  );

  const createdActions: string[] = [];
  const totalActions = eventDefinitions.length;
  let currentAction = 0;

  for (const def of eventDefinitions) {
    currentAction++;
    printStep(currentAction, totalActions, `Creating action: ${def.name}`);

    if (existingEventNames.has(def.event)) {
      console.log(
        `    ${colors.dim}Action for '${def.event}' already exists, skipping${colors.reset}`,
      );
      continue;
    }

    const action = await createAction(
      apiKey,
      projectId,
      def.name,
      def.event,
      def.description,
    );

    if (action) {
      printSuccess(`Created: ${def.name} (${def.event})`);
      createdActions.push(def.event);
    } else {
      printError(`Failed to create: ${def.name}`);
    }
  }

  console.log("");
  if (createdActions.length > 0) {
    printSuccess(`Created ${createdActions.length} event actions`);
  } else {
    printInfo("No new actions created (all already exist)");
  }

  return createdActions;
}

// ============================================================================
// Step 4: Setup Email Workflows
// ============================================================================

async function setupEmailWorkflows(): Promise<string[]> {
  printHeader("STEP 4: SETUP EMAIL WORKFLOWS");

  console.log(
    `  ${colors.dim}PostHog email workflows are configured in the PostHog UI.${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}This step will generate configuration files and instructions.${colors.reset}`,
  );
  console.log("");

  // Display workflow definitions
  console.log(`  ${colors.bold}Available Workflows:${colors.reset}`);
  for (const workflow of WORKFLOW_DEFINITIONS) {
    console.log(`\n  ${colors.cyan}${workflow.name}${colors.reset}`);
    console.log(
      `    ${colors.dim}Trigger: ${workflow.trigger.event}${colors.reset}`,
    );
    console.log(`    ${colors.dim}Steps:${colors.reset}`);
    for (const step of workflow.steps) {
      if (step.type === "send_email") {
        console.log(`      - Send email: ${step.template} ("${step.subject}")`);
      } else if (step.type === "wait") {
        console.log(`      - Wait: ${step.duration}`);
      }
    }
  }

  console.log("");

  const generateConfig = await confirm({
    message: "Generate workflow configuration files?",
    default: true,
  });

  if (!generateConfig) {
    printWarning("Workflow configuration skipped");
    return [];
  }

  // Create workflow config directory
  const configDir = resolve(process.cwd(), "config/posthog");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Generate workflow configuration files
  const createdWorkflows: string[] = [];

  for (const workflow of WORKFLOW_DEFINITIONS) {
    const configPath = resolve(configDir, `workflow-${workflow.id}.json`);
    writeFileSync(configPath, JSON.stringify(workflow, null, 2), "utf-8");
    createdWorkflows.push(workflow.id);
    printSuccess(`Created: config/posthog/workflow-${workflow.id}.json`);
  }

  // Generate email templates directory
  const templatesDir = resolve(configDir, "templates");
  if (!existsSync(templatesDir)) {
    mkdirSync(templatesDir, { recursive: true });
  }

  // Save email templates
  for (const template of EMAIL_TEMPLATES) {
    const htmlPath = resolve(templatesDir, `${template.id}.html`);
    const textPath = resolve(templatesDir, `${template.id}.txt`);

    writeFileSync(htmlPath, template.htmlContent, "utf-8");
    writeFileSync(textPath, template.textContent, "utf-8");
    printSuccess(`Created: config/posthog/templates/${template.id}.html`);
  }

  console.log("");
  printInfo("Workflow configuration files have been generated.");
  console.log("");
  console.log(`  ${colors.bold}Next Steps to Enable Workflows:${colors.reset}`);
  console.log(
    `  ${colors.dim}1. Go to PostHog: ${colors.cyan}https://app.posthog.com/data-pipelines${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}2. Create a new 'Email' destination${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}3. Configure SMTP settings or use a provider (Customer.io, Loops, etc.)${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}4. Set up filters to trigger on specific events${colors.reset}`,
  );
  console.log(
    `  ${colors.dim}5. Use the generated templates in config/posthog/templates/${colors.reset}`,
  );

  return createdWorkflows;
}

// ============================================================================
// Step 5: Test Integration
// ============================================================================

async function testIntegration(
  apiKey: string,
  projectId: number,
): Promise<boolean> {
  printHeader("STEP 5: TEST INTEGRATION");

  const runTest = await confirm({
    message: "Send a test event to PostHog?",
    default: true,
  });

  if (!runTest) {
    printWarning("Integration test skipped");
    return false;
  }

  printInfo("Sending test event...");

  try {
    // Use the public key for capturing events
    const publicKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";

    if (!publicKey) {
      printError("NEXT_PUBLIC_POSTHOG_KEY not found");
      return false;
    }

    const response = await fetch("https://app.posthog.com/capture/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: publicKey,
        event: "setup.test_event",
        properties: {
          distinct_id: `setup-test-${Date.now()}`,
          source: "setup-posthog-script",
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (response.ok) {
      printSuccess("Test event sent successfully!");
      console.log("");
      console.log(
        `  ${colors.dim}View in PostHog: ${colors.cyan}https://app.posthog.com/events?eventType=setup.test_event${colors.reset}`,
      );
      return true;
    }

    printError(`Failed to send test event: ${response.statusText}`);
    return false;
  } catch (error) {
    printError(`Error sending test event: ${error}`);
    return false;
  }
}

// ============================================================================
// Print Summary
// ============================================================================

function printSummary(result: SetupResult) {
  printHeader("SETUP COMPLETE");

  console.log(`  ${colors.bold}Summary:${colors.reset}`);
  console.log("");

  if (result.credentialsVerified) {
    printSuccess(
      `Connected to PostHog project: ${result.projectName || "Unknown"}`,
    );
    console.log(
      `    ${colors.dim}Project ID: ${result.projectId}${colors.reset}`,
    );
  } else {
    printError("PostHog credentials not verified");
  }

  if (result.actionsCreated.length > 0) {
    printSuccess(`Created ${result.actionsCreated.length} event actions:`);
    for (const action of result.actionsCreated) {
      console.log(`    ${colors.dim}${action}${colors.reset}`);
    }
  } else {
    printWarning("No new event actions created");
  }

  if (result.workflowsCreated.length > 0) {
    printSuccess(
      `Generated ${result.workflowsCreated.length} workflow configurations:`,
    );
    for (const workflow of result.workflowsCreated) {
      console.log(`    ${colors.dim}${workflow}${colors.reset}`);
    }
  }

  if (result.emailTemplatesCreated.length > 0) {
    printSuccess(
      `Created ${result.emailTemplatesCreated.length} email templates`,
    );
  }

  if (result.envUpdated) {
    printSuccess("Environment variables updated in .env.local");
  }

  console.log("");
  console.log(`${colors.bold}  Next Steps:${colors.reset}`);
  console.log(
    `    1. ${colors.cyan}bun run dev${colors.reset} - Start the development server`,
  );
  console.log(
    `    2. ${colors.cyan}bun run posthog:test-event${colors.reset} - Test event tracking`,
  );
  console.log(
    `    3. Visit ${colors.cyan}https://app.posthog.com/data-pipelines${colors.reset} to configure email workflows`,
  );
  console.log("");
  console.log(`${colors.bold}  Useful Links:${colors.reset}`);
  console.log(
    `    ${colors.dim}PostHog Dashboard:${colors.reset}     ${colors.cyan}https://app.posthog.com${colors.reset}`,
  );
  console.log(
    `    ${colors.dim}Events:${colors.reset}                ${colors.cyan}https://app.posthog.com/events${colors.reset}`,
  );
  console.log(
    `    ${colors.dim}Actions:${colors.reset}               ${colors.cyan}https://app.posthog.com/data-management/actions${colors.reset}`,
  );
  console.log(
    `    ${colors.dim}Data Pipelines:${colors.reset}        ${colors.cyan}https://app.posthog.com/pipeline/destinations${colors.reset}`,
  );
  console.log(
    `    ${colors.dim}Documentation:${colors.reset}         ${colors.cyan}https://posthog.com/docs${colors.reset}`,
  );
  console.log("");
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  // Welcome message
  console.log("");
  console.log(
    `${colors.bold}${colors.magenta}┌${"─".repeat(58)}┐${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.bold}PostHog Setup Wizard${colors.reset}                                    ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}                                                          ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}│${colors.reset}  ${colors.dim}Configure PostHog analytics and email workflows${colors.reset}        ${colors.magenta}│${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.magenta}└${"─".repeat(58)}┘${colors.reset}`,
  );

  const result: SetupResult = {
    credentialsVerified: false,
    actionsCreated: [],
    workflowsCreated: [],
    emailTemplatesCreated: [],
    envUpdated: false,
  };

  // Step 1: Verify credentials
  const { valid, project, apiKey } = await verifyCredentials();
  result.credentialsVerified = valid;

  if (!valid || !project) {
    console.log("");
    printError("Cannot proceed without valid PostHog credentials.");
    console.log(
      `  ${colors.dim}Get your API keys from: ${colors.cyan}https://app.posthog.com/settings${colors.reset}`,
    );
    process.exit(1);
  }

  result.projectId = String(project.id);
  result.projectName = project.name;

  // Step 2: Configure app settings
  await configureAppSettings();
  result.envUpdated = true;

  // Step 3: Create event actions
  result.actionsCreated = await createEventActions(apiKey, project.id);

  // Step 4: Setup email workflows
  result.workflowsCreated = await setupEmailWorkflows();
  result.emailTemplatesCreated = EMAIL_TEMPLATES.map((t) => t.id);

  // Step 5: Test integration
  await testIntegration(apiKey, project.id);

  // Print summary
  printSummary(result);

  // Save setup summary
  const summaryPath = resolve(
    process.cwd(),
    "config/posthog/setup-summary.json",
  );
  const configDir = resolve(process.cwd(), "config/posthog");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        setup_date: new Date().toISOString(),
        ...result,
      },
      null,
      2,
    ),
    "utf-8",
  );
  printInfo(`Setup summary saved to: config/posthog/setup-summary.json`);
}

main().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log(`\n${colors.dim}Setup cancelled.${colors.reset}`);
    process.exit(0);
  }
  console.error(`\n${colors.red}Setup failed:${colors.reset}`, error.message);
  process.exit(1);
});
