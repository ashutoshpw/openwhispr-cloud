// @repo/analytics — public surface

// Types
export type {
  SeriesPoint,
  SeriesResult,
  SnapshotItem,
  TopOrgItem,
} from "./types";

// Events
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

// Client-side functions
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

// React hooks
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

// Provider
export { PostHogProvider, posthog } from "./posthog-provider";

// Server-side functions
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
