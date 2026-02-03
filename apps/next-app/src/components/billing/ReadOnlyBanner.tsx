"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";

interface ReadOnlyBannerProps {
  workspaceSlug: string;
  reason?:
    | "trial_expired"
    | "subscription_cancelled"
    | "payment_failed"
    | "suspended";
  canManageBilling?: boolean;
}

export function ReadOnlyBanner({
  workspaceSlug,
  reason = "trial_expired",
  canManageBilling = false,
}: ReadOnlyBannerProps) {
  const getMessage = () => {
    switch (reason) {
      case "trial_expired":
        return {
          title: "Trial Expired",
          description:
            "Your free trial has ended. Upgrade to continue using all features.",
        };
      case "subscription_cancelled":
        return {
          title: "Subscription Cancelled",
          description:
            "Your subscription has been cancelled. Resubscribe to restore full access.",
        };
      case "payment_failed":
        return {
          title: "Payment Failed",
          description:
            "We couldn't process your payment. Please update your payment method.",
        };
      case "suspended":
        return {
          title: "Workspace Suspended",
          description:
            "This workspace has been suspended. Contact support for assistance.",
        };
      default:
        return {
          title: "Read-Only Mode",
          description:
            "This workspace is in read-only mode. Upgrade to make changes.",
        };
    }
  };

  const { title, description } = getMessage();

  return (
    <Alert
      variant="destructive"
      className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        {title}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-700 dark:text-amber-300">
          {description}
        </span>
        {canManageBilling && (
          <Button asChild size="sm" variant="outline" className="ml-4">
            <Link href={`/dashboard/${workspaceSlug}/~/settings/billing`}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
