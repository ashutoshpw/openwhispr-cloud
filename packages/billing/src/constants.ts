import type { FeatureDefinition, FeatureMap } from "./types";

// Standard feature keys
export const FEATURE_KEYS = {
  MAX_MEMBERS: "max_members",
  MAX_PROJECTS: "max_projects",
  API_ACCESS: "api_access",
  CUSTOM_DOMAIN: "custom_domain",
  PRIORITY_SUPPORT: "priority_support",
  AUDIT_LOGS: "audit_logs",
  SSO_ENABLED: "sso_enabled",
  WEBHOOKS: "webhooks",
  ANALYTICS: "analytics",
  WHITE_LABEL: "white_label",
} as const;

// Feature definitions with metadata
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: FEATURE_KEYS.MAX_MEMBERS,
    label: "Team Members",
    description: "Maximum number of team members allowed",
    type: "number",
    defaultFreeValue: 1,
  },
  {
    key: FEATURE_KEYS.MAX_PROJECTS,
    label: "Projects",
    description: "Maximum number of projects allowed",
    type: "number",
    defaultFreeValue: 1,
  },
  {
    key: FEATURE_KEYS.API_ACCESS,
    label: "API Access",
    description: "Access to REST and GraphQL APIs",
    type: "boolean",
    defaultFreeValue: false,
  },
  {
    key: FEATURE_KEYS.CUSTOM_DOMAIN,
    label: "Custom Domain",
    description: "Use your own custom domain",
    type: "boolean",
    defaultFreeValue: false,
  },
  {
    key: FEATURE_KEYS.PRIORITY_SUPPORT,
    label: "Priority Support",
    description: "Access to priority support channels",
    type: "boolean",
    defaultFreeValue: false,
  },
  {
    key: FEATURE_KEYS.AUDIT_LOGS,
    label: "Audit Logs",
    description: "Access to detailed audit logs",
    type: "boolean",
    defaultFreeValue: false,
  },
  {
    key: FEATURE_KEYS.SSO_ENABLED,
    label: "SSO/SAML",
    description: "Single Sign-On and SAML integration",
    type: "boolean",
    defaultFreeValue: false,
  },
  {
    key: FEATURE_KEYS.WEBHOOKS,
    label: "Webhooks",
    description: "Webhook integrations for events",
    type: "boolean",
    defaultFreeValue: false,
  },
  {
    key: FEATURE_KEYS.ANALYTICS,
    label: "Advanced Analytics",
    description: "Access to advanced analytics dashboard",
    type: "boolean",
    defaultFreeValue: false,
  },
  {
    key: FEATURE_KEYS.WHITE_LABEL,
    label: "White Label",
    description: "Remove branding and customize appearance",
    type: "boolean",
    defaultFreeValue: false,
  },
];

// Free tier feature defaults
export const FREE_TIER_FEATURES: FeatureMap = {
  [FEATURE_KEYS.MAX_MEMBERS]: 1,
  [FEATURE_KEYS.MAX_PROJECTS]: 1,
  [FEATURE_KEYS.API_ACCESS]: false,
  [FEATURE_KEYS.CUSTOM_DOMAIN]: false,
  [FEATURE_KEYS.PRIORITY_SUPPORT]: false,
  [FEATURE_KEYS.AUDIT_LOGS]: false,
  [FEATURE_KEYS.SSO_ENABLED]: false,
  [FEATURE_KEYS.WEBHOOKS]: false,
  [FEATURE_KEYS.ANALYTICS]: false,
  [FEATURE_KEYS.WHITE_LABEL]: false,
};

// Trial duration in days
export const TRIAL_DURATION_DAYS = 14;

// Pending workspace TTL in hours
export const PENDING_WORKSPACE_TTL_HOURS = 24;

// Organization status values
export const ORG_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  READONLY: "readonly",
  SUSPENDED: "suspended",
} as const;

// Audit action values
export const AUDIT_ACTIONS = {
  WORKSPACE_CREATED: "workspace_created",
  SUBSCRIPTION_CREATED: "subscription_created",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  PLAN_UPGRADED: "plan_upgraded",
  PLAN_DOWNGRADED: "plan_downgraded",
  TRIAL_STARTED: "trial_started",
  TRIAL_ENDED: "trial_ended",
  STATUS_CHANGED: "status_changed",
  FEATURE_GRANTED: "feature_granted",
  FEATURE_REVOKED: "feature_revoked",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_SUCCEEDED: "payment_succeeded",
} as const;

// Member roles that can manage billing
export const BILLING_MANAGEMENT_ROLES = ["owner", "billing_admin"] as const;

// App settings keys
export const APP_SETTINGS_KEYS = {
  ENTERPRISE_CONTACT_LINK: "enterprise_contact_link",
} as const;

// Default enterprise contact link
export const DEFAULT_ENTERPRISE_CONTACT_LINK = "mailto:sales@example.com";

// Stripe schema name
export const STRIPE_SCHEMA = process.env.STRIPE_SCHEMA ?? "stripe";
