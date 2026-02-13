export interface WorkflowStep {
  type: "send_email" | "wait";
  template?: string;
  subject?: string;
  duration?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: {
    event: string;
    filters?: Record<string, unknown>;
  };
  steps: WorkflowStep[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}
