import { PostHog } from "posthog-node";
import type { AnalyticsEvent, UserProperties } from "./events";

// ============================================================================
// Server-side PostHog Client
// ============================================================================

let posthogClient: PostHog | null = null;

/**
 * Get the PostHog server client (singleton)
 */
function getPostHogClient(): PostHog | null {
  const apiKey =
    process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostHog Server] No API key configured");
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 1, // Flush immediately for serverless environments
      flushInterval: 0,
    });
  }

  return posthogClient;
}

// ============================================================================
// Server-side Analytics Functions
// ============================================================================

/**
 * Track an event from the server side
 */
export async function trackServerEvent(
  eventName: AnalyticsEvent,
  distinctId: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[PostHog Server] Event tracked (not initialized):",
        eventName,
        properties,
      );
    }
    return;
  }

  client.capture({
    distinctId,
    event: eventName,
    properties,
  });

  // Flush immediately for serverless
  await client.flush();
}

/**
 * Identify a user from the server side
 */
export async function identifyServerUser(
  distinctId: string,
  properties?: Partial<UserProperties>,
): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[PostHog Server] User identified (not initialized):",
        distinctId,
        properties,
      );
    }
    return;
  }

  client.identify({
    distinctId,
    properties,
  });

  await client.flush();
}

/**
 * Set user properties from the server side
 */
export async function setServerUserProperties(
  distinctId: string,
  properties: Partial<UserProperties>,
): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    return;
  }

  client.identify({
    distinctId,
    properties: {
      $set: properties,
    },
  });

  await client.flush();
}

/**
 * Set user properties once (won't overwrite) from the server side
 */
export async function setServerUserPropertiesOnce(
  distinctId: string,
  properties: Partial<UserProperties>,
): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    return;
  }

  client.identify({
    distinctId,
    properties: {
      $set_once: properties,
    },
  });

  await client.flush();
}

/**
 * Alias a user from the server side
 */
export async function aliasServerUser(
  distinctId: string,
  alias: string,
): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    return;
  }

  client.alias({
    distinctId,
    alias,
  });

  await client.flush();
}

/**
 * Get feature flag value from the server
 */
export async function getServerFeatureFlag(
  flagKey: string,
  distinctId: string,
  properties?: Record<string, string>,
): Promise<boolean | string | undefined> {
  const client = getPostHogClient();

  if (!client) {
    return undefined;
  }

  return await client.getFeatureFlag(flagKey, distinctId, {
    personProperties: properties,
  });
}

/**
 * Check if a feature is enabled from the server
 */
export async function isServerFeatureEnabled(
  flagKey: string,
  distinctId: string,
  properties?: Record<string, string>,
): Promise<boolean> {
  const flag = await getServerFeatureFlag(flagKey, distinctId, properties);
  return flag === true || flag === "true";
}

/**
 * Get all feature flags for a user from the server
 */
export async function getServerAllFlags(
  distinctId: string,
  properties?: Record<string, string>,
): Promise<Record<string, boolean | string>> {
  const client = getPostHogClient();

  if (!client) {
    return {};
  }

  const flags = await client.getAllFlags(distinctId, {
    personProperties: properties,
  });

  return flags as Record<string, boolean | string>;
}

/**
 * Shutdown the PostHog client (call on server shutdown)
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}

// ============================================================================
// Helper: Track event with automatic user context
// ============================================================================

interface ServerTrackOptions {
  userId: string;
  email?: string;
  name?: string;
  organizationId?: string;
}

/**
 * Track an event with automatic user context enrichment
 */
export async function trackServerEventWithContext(
  eventName: AnalyticsEvent,
  options: ServerTrackOptions,
  properties?: Record<string, unknown>,
): Promise<void> {
  const enrichedProperties = {
    ...properties,
    $set: {
      email: options.email,
      name: options.name,
      organization_id: options.organizationId,
    },
  };

  await trackServerEvent(eventName, options.userId, enrichedProperties);
}
