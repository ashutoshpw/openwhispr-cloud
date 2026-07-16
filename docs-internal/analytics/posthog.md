---
title: PostHog analytics integration
description: Analytics events and workflow configuration for the starter.
---

# PostHog Analytics Integration

This document describes the PostHog analytics integration for tracking user lifecycle events and triggering email workflows.

## Overview

PostHog is configured for:
- **User Analytics**: Track user actions, feature usage, and conversion events
- **Email Workflows**: Trigger automated email sequences based on user events
- **Feature Flags**: Control feature rollouts (optional)

## Setup

### 1. Run the Setup Script

```bash
bun run setup:posthog
```

This interactive script will:
1. Verify your PostHog API keys
2. Create analytics actions in PostHog
3. Display workflow configuration instructions

### 2. Environment Variables

Add these to `.env.local`:

```env
# Required for client-side tracking
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Required for server-side tracking and setup
POSTHOG_PROJECT_API_KEY=phc_your_project_api_key  # Same as above, for server
POSTHOG_PERSONAL_API_KEY=phx_your_personal_api_key  # For setup script
POSTHOG_PROJECT_ID=your_project_id

# App settings (used in emails)
NEXT_PUBLIC_APP_URL=https://your-app.com
NEXT_PUBLIC_APP_NAME=Your App Name
```

Get your keys from:
- Project API Key: PostHog Settings > Project > Project API Key
- Personal API Key: PostHog Settings > Personal API Keys

## Events Tracked

### User Lifecycle Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `user.created` | User signs up | `email`, `name`, `provider` |
| `user.logged_in` | User signs in | `email`, `provider` |
| `user.checked_pricing` | User views billing page | `source_page`, `current_plan`, `viewed_plans` |
| `user.trial_started` | Trial subscription created | `email`, `plan_id`, `trial_duration_days` |
| `user.subscription_created` | Paid subscription created | `email`, `plan_id`, `billing_period`, `amount` |
| `user.subscription_cancelled` | Subscription cancelled | `email`, `plan_id`, `cancellation_reason` |

### Where Events Are Tracked

- **Sign-up**: `apps/next-app/src/app/api/auth/sign-up/email/route.ts`
- **Sign-in**: `apps/next-app/src/app/api/auth/sign-in/email/route.ts`
- **Subscription Events**: `apps/next-app/src/app/api/webhooks/stripe/route.ts`
- **Pricing Page Views**: `apps/next-app/src/app/dashboard/[workspaceSlug]/~/settings/billing/BillingSettings.tsx`

## Email Workflows

PostHog's native email capabilities can trigger automated sequences. Workflows are defined in `scripts/posthog-workflows.ts`.

### User Onboarding Workflow

Triggered by: `user.created`

```
User Signs Up
    |
    v
Welcome Email (immediate)
    |
    v
Wait 5 minutes
    |
    v
Getting Started Email
    |
    v
Wait 24 hours
    |
    v
Tips & Features Email
```

### Trial Management Workflow

Triggered by: `user.trial_started`

```
Trial Started
    |
    v
Trial Welcome Email (immediate)
    |
    v
Wait 3 days
    |
    v
Features Highlight Email
    |
    v
Wait 4 days
    |
    v
Trial Conversion Email (if no active subscription)
```

### Pricing Follow-up Workflow

Triggered by: `user.checked_pricing`

```
User Views Pricing
    |
    v
Wait 1 hour
    |
    v
Pricing Help Email (if no active subscription)
```

## Usage

### Client-Side Tracking

```tsx
"use client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent, useAnalytics } from "@/lib/analytics/hooks";

function MyComponent() {
  const trackEvent = useTrackEvent();
  
  const handleAction = () => {
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature_name: "export",
      feature_category: "data",
    });
  };
  
  return <button onClick={handleAction}>Export</button>;
}
```

### Server-Side Tracking

```ts
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent, identifyServerUser } from "@/lib/analytics/server";

// In an API route or server action
await trackServerEvent(ANALYTICS_EVENTS.USER_CREATED, userId, {
  email: user.email,
  name: user.name,
  provider: "email",
});

// Identify user with properties
await identifyServerUser(userId, {
  email: user.email,
  name: user.name,
  plan_type: "free",
});
```

### Feature Flags

```tsx
"use client";

import { useFeatureFlag, useFeatureEnabled } from "@/lib/analytics/hooks";

function MyComponent() {
  const isNewDashboard = useFeatureEnabled("new-dashboard");
  
  if (isNewDashboard) {
    return <NewDashboard />;
  }
  
  return <OldDashboard />;
}
```

## Testing

### Test Event Tracking

```bash
# Send a test event
bun run posthog:test-event

# Test a specific event type
bun run posthog:test-event -- --event user.created --email test@example.com
```

### Test Workflow Triggers

```bash
# Test workflow trigger
bun run posthog:test-workflow

# Test specific workflow
bun run posthog:test-workflow -- --workflow onboarding --email test@example.com
```

## Architecture

```
apps/next-app/src/lib/analytics/
├── events.ts           # Event definitions and TypeScript types
├── posthog-provider.tsx # React Context provider
├── client.ts           # Client-side tracking utilities
├── server.ts           # Server-side tracking utilities
├── hooks.ts            # React hooks for tracking
└── index.ts            # Main exports

scripts/
├── setup-posthog.ts    # Interactive setup wizard
├── posthog-workflows.ts # Workflow definitions
├── test-posthog-event.ts # Event testing utility
└── test-posthog-workflow.ts # Workflow testing utility
```

## Best Practices

1. **Use Constants**: Always use `ANALYTICS_EVENTS` constants instead of string literals
2. **Track on Server When Possible**: Server-side tracking is more reliable
3. **Include User Context**: Always include `email` and relevant properties
4. **Test Workflows**: Use test scripts before deploying to production
5. **Monitor in PostHog**: Check PostHog dashboard for event delivery

## Troubleshooting

### Events Not Appearing

1. Check that `NEXT_PUBLIC_POSTHOG_KEY` is set correctly
2. Verify you're using the correct project
3. Check browser console for errors
4. Ensure PostHog provider wraps your app

### Emails Not Sending

1. Verify PostHog email integration is configured
2. Check that actions are created in PostHog
3. Verify webhook events are being received
4. Check PostHog activity feed for errors

### Server-Side Tracking Issues

1. Ensure `POSTHOG_PROJECT_API_KEY` is set
2. Check that `flush()` is being called (important for serverless)
3. Verify network connectivity to PostHog

## Links

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Node.js SDK](https://posthog.com/docs/libraries/node)
- [PostHog React SDK](https://posthog.com/docs/libraries/react)
- [PostHog Actions & Workflows](https://posthog.com/docs/actions)
