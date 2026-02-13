"use client";

import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";
import type {
  AnalyticsEvent,
  AnalyticsEventMap,
  UserProperties,
} from "./events";

// ============================================================================
// Analytics Hooks
// ============================================================================

/**
 * Hook to track events with type safety
 */
export function useTrackEvent() {
  const posthog = usePostHog();

  return useCallback(
    <E extends AnalyticsEvent>(
      eventName: E,
      properties?: E extends keyof AnalyticsEventMap
        ? AnalyticsEventMap[E]
        : Record<string, unknown>,
    ) => {
      if (posthog) {
        posthog.capture(eventName, properties);
      }
    },
    [posthog],
  );
}

/**
 * Hook to identify users
 */
export function useIdentify() {
  const posthog = usePostHog();

  return useCallback(
    (userId: string, properties?: Partial<UserProperties>) => {
      if (posthog) {
        posthog.identify(userId, properties);
      }
    },
    [posthog],
  );
}

/**
 * Hook to reset user identity (on logout)
 */
export function useReset() {
  const posthog = usePostHog();

  return useCallback(() => {
    if (posthog) {
      posthog.reset();
    }
  }, [posthog]);
}

/**
 * Hook to check feature flags
 */
export function useFeatureFlag(flagKey: string): boolean | string | undefined {
  const posthog = usePostHog();

  if (!posthog) {
    return undefined;
  }

  return posthog.getFeatureFlag(flagKey);
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureEnabled(flagKey: string): boolean {
  const posthog = usePostHog();

  if (!posthog) {
    return false;
  }

  return posthog.isFeatureEnabled(flagKey) ?? false;
}

/**
 * Hook to get the current distinct ID
 */
export function useDistinctId(): string | undefined {
  const posthog = usePostHog();

  if (!posthog) {
    return undefined;
  }

  return posthog.get_distinct_id();
}

/**
 * Hook to set user properties
 */
export function useSetUserProperties() {
  const posthog = usePostHog();

  return useCallback(
    (properties: Partial<UserProperties>) => {
      if (posthog) {
        posthog.people.set(properties);
      }
    },
    [posthog],
  );
}

/**
 * Hook to register super properties (sent with every event)
 */
export function useRegisterSuperProperties() {
  const posthog = usePostHog();

  return useCallback(
    (properties: Record<string, unknown>) => {
      if (posthog) {
        posthog.register(properties);
      }
    },
    [posthog],
  );
}

/**
 * Combined hook for common analytics operations
 */
export function useAnalytics() {
  const trackEvent = useTrackEvent();
  const identify = useIdentify();
  const reset = useReset();
  const setUserProperties = useSetUserProperties();

  return {
    trackEvent,
    identify,
    reset,
    setUserProperties,
  };
}
