"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function StripeSyncNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Stripe Sync Engine Not Configured
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        <p className="mb-2">
          Currently fetching data directly from Stripe API. For better performance, configure Stripe Sync Engine:
        </p>
        <div className="flex gap-2 items-center">
          <Button asChild variant="outline" size="sm">
            <Link
              href="https://dashboard.stripe.com/sync"
              target="_blank"
              className="text-yellow-800 dark:text-yellow-200"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Configure Stripe Sync
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-yellow-800 dark:text-yellow-200"
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
