// ============================================================================
// PostHog Analytics - Main Exports
// ============================================================================

// Event definitions and types
export {
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  type AnalyticsEventMap,
  type UserProperties,
  type UserCreatedProperties,
  type UserVerifiedProperties,
  type UserLoggedInProperties,
  type UserProfileUpdatedProperties,
  type UserCheckedPricingProperties,
  type UserTrialStartedProperties,
  type UserTrialEndingProperties,
  type UserSubscriptionCreatedProperties,
  type UserSubscriptionCancelledProperties,
  type FeatureUsedProperties,
  type OrganizationCreatedProperties,
  type OrganizationMemberInvitedProperties,
} from "./events";

// Client-side functions (use in client components)
export {
  trackEvent,
  identifyUser,
  setUserProperties,
  setUserPropertiesOnce,
  resetUser,
  aliasUser,
  registerSuperProperties,
  unregisterSuperProperty,
  getFeatureFlag,
  isFeatureEnabled,
  getDistinctId,
  optOut,
  optIn,
  hasOptedOut,
  isPostHogReady,
} from "./client";

// React hooks (use in client components)
export {
  useTrackEvent,
  useIdentify,
  useReset,
  useFeatureFlag,
  useFeatureEnabled,
  useDistinctId,
  useSetUserProperties,
  useRegisterSuperProperties,
  useAnalytics,
} from "./hooks";

// Provider component
export { PostHogProvider, posthog } from "./posthog-provider";

// Server-side functions (use in server components/API routes)
export {
  trackServerEvent,
  identifyServerUser,
  setServerUserProperties,
  setServerUserPropertiesOnce,
  aliasServerUser,
  getServerFeatureFlag,
  isServerFeatureEnabled,
  getServerAllFlags,
  shutdownPostHog,
  trackServerEventWithContext,
} from "./server";
