"use client";

import posthog from "posthog-js";
import type {
  AnalyticsEvent,
  AnalyticsEventMap,
  UserProperties,
} from "./events";

// ============================================================================
// Client-side Analytics Functions
// ============================================================================

/**
 * Check if PostHog is initialized and ready
 */
export function isPostHogReady(): boolean {
  return (
    typeof window !== "undefined" &&
    !!process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    posthog.__loaded
  );
}

/**
 * Track an analytics event with type-safe properties
 */
export function trackEvent<E extends AnalyticsEvent>(
  eventName: E,
  properties?: E extends keyof AnalyticsEventMap
    ? AnalyticsEventMap[E]
    : Record<string, unknown>,
): void {
  if (!isPostHogReady()) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[PostHog] Event tracked (not initialized):",
        eventName,
        properties,
      );
    }
    return;
  }

  posthog.capture(eventName, properties);
}

/**
 * Identify a user with their properties
 */
export function identifyUser(
  userId: string,
  properties?: Partial<UserProperties>,
): void {
  if (!isPostHogReady()) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[PostHog] User identified (not initialized):",
        userId,
        properties,
      );
    }
    return;
  }

  posthog.identify(userId, properties);
}

/**
 * Update user properties without changing identity
 */
export function setUserProperties(properties: Partial<UserProperties>): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.people.set(properties);
}

/**
 * Set user properties only once (won't overwrite existing values)
 */
export function setUserPropertiesOnce(
  properties: Partial<UserProperties>,
): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.people.set_once(properties);
}

/**
 * Reset the current user (on logout)
 */
export function resetUser(): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.reset();
}

/**
 * Alias a user ID (for linking anonymous to identified users)
 */
export function aliasUser(alias: string): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.alias(alias);
}

/**
 * Register properties to be sent with every event
 */
export function registerSuperProperties(
  properties: Record<string, unknown>,
): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.register(properties);
}

/**
 * Unregister a super property
 */
export function unregisterSuperProperty(propertyName: string): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.unregister(propertyName);
}

/**
 * Get a feature flag value
 */
export function getFeatureFlag(flagKey: string): boolean | string | undefined {
  if (!isPostHogReady()) {
    return undefined;
  }

  return posthog.getFeatureFlag(flagKey);
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!isPostHogReady()) {
    return false;
  }

  return posthog.isFeatureEnabled(flagKey) ?? false;
}

/**
 * Get the current distinct ID
 */
export function getDistinctId(): string | undefined {
  if (!isPostHogReady()) {
    return undefined;
  }

  return posthog.get_distinct_id();
}

/**
 * Opt out of tracking
 */
export function optOut(): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.opt_out_capturing();
}

/**
 * Opt in to tracking
 */
export function optIn(): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.opt_in_capturing();
}

/**
 * Check if user has opted out
 */
export function hasOptedOut(): boolean {
  if (!isPostHogReady()) {
    return false;
  }

  return posthog.has_opted_out_capturing();
}
