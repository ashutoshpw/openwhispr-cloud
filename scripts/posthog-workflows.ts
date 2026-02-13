/**
 * PostHog Workflow Definitions
 *
 * These workflow definitions are used by the setup script to create
 * automated email workflows in PostHog Cloud.
 */

import type { WorkflowDefinition } from "./posthog-workflow-types";

export type {
  EmailTemplate,
  WorkflowDefinition,
  WorkflowStep,
} from "./posthog-workflow-types";
export {
  EMAIL_TEMPLATES,
  getEmailTemplateById,
  getEmailTemplateIds,
} from "./posthog-email-templates";

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: "user-onboarding",
    name: "User Onboarding Sequence",
    description: "Welcome email series for new users",
    trigger: {
      event: "user.created",
    },
    steps: [
      {
        type: "send_email",
        template: "welcome",
        subject: "Welcome to {{app_name}}!",
      },
      {
        type: "wait",
        duration: "5m",
      },
      {
        type: "send_email",
        template: "getting-started",
        subject: "Get started with {{app_name}} in 3 easy steps",
      },
      {
        type: "wait",
        duration: "24h",
      },
      {
        type: "send_email",
        template: "tips-and-tricks",
        subject: "Pro tips to get the most out of {{app_name}}",
      },
    ],
  },
  {
    id: "trial-management",
    name: "Trial Management Sequence",
    description: "Nurture trial users towards conversion",
    trigger: {
      event: "user.trial_started",
    },
    steps: [
      {
        type: "send_email",
        template: "trial-welcome",
        subject: "Your trial has started - here's what you can do",
      },
      {
        type: "wait",
        duration: "3d",
      },
      {
        type: "send_email",
        template: "feature-highlights",
        subject: "Discover powerful features you might have missed",
      },
      {
        type: "wait",
        duration: "4d",
      },
      {
        type: "send_email",
        template: "trial-ending-soon",
        subject: "Your trial ends soon - don't lose access",
      },
    ],
  },
  {
    id: "pricing-followup",
    name: "Pricing Page Follow-up",
    description: "Follow up with users who viewed pricing",
    trigger: {
      event: "user.checked_pricing",
      filters: {
        "person.properties.subscription_status": { $ne: "active" },
      },
    },
    steps: [
      {
        type: "wait",
        duration: "1h",
      },
      {
        type: "send_email",
        template: "pricing-followup",
        subject: "Questions about our pricing? We're here to help",
      },
    ],
  },
];

export function getWorkflowById(id: string): WorkflowDefinition | undefined {
  return WORKFLOW_DEFINITIONS.find((workflow) => workflow.id === id);
}

export function getWorkflowIds(): string[] {
  return WORKFLOW_DEFINITIONS.map((workflow) => workflow.id);
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}
