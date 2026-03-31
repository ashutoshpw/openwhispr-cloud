import { canUserCreateFreeWorkspace } from "@repo/billing";
import { getAppSetting } from "@repo/billing";
import {
  APP_SETTINGS_KEYS,
  DEFAULT_ENTERPRISE_CONTACT_LINK,
} from "@repo/billing/constants";
import { getPricingTiers } from "@/lib/stripe/queries";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WorkspaceForm } from "./WorkspaceForm";

export default async function NewWorkspacePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in?redirect=/workspace/new");
  }

  // Fetch pricing tiers and check if user can create free workspace
  const [pricingTiers, canCreateFree, enterpriseLink] = await Promise.all([
    getPricingTiers(),
    canUserCreateFreeWorkspace(session.user.id),
    getAppSetting(APP_SETTINGS_KEYS.ENTERPRISE_CONTACT_LINK),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create a New Workspace</h1>
          <p className="text-muted-foreground mt-2">
            Set up your workspace and choose a plan that fits your needs.
          </p>
        </div>
        <WorkspaceForm
          pricingTiers={pricingTiers}
          canCreateFree={canCreateFree}
          enterpriseContactLink={
            enterpriseLink || DEFAULT_ENTERPRISE_CONTACT_LINK
          }
        />
      </div>
    </div>
  );
}
