import { getProviderName } from "@repo/auth/config";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

async function getUserOrganizationCount(): Promise<number> {
  try {
    const providerName = getProviderName();

    if (providerName === "better-auth") {
      const { listBetterAuthOrganizations } = await import(
        "@/lib/auth/providers/better-auth/organization-actions"
      );
      const result = await listBetterAuthOrganizations();
      return result.data?.length ?? 0;
    }

    if (providerName === "next-auth") {
      const { listNextAuthOrganizations } = await import(
        "@/lib/auth/providers/next-auth/organization-actions"
      );
      const result = await listNextAuthOrganizations();
      return result.data?.length ?? 0;
    }

    if (providerName === "clerk-dev") {
      const { listClerkOrganizations } = await import(
        "@/lib/auth/providers/clerk-dev/organization-actions"
      );
      const result = await listClerkOrganizations();
      return result.data?.length ?? 0;
    }

    return 0;
  } catch {
    return 0;
  }
}

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Check if user already has workspaces
  const orgCount = await getUserOrganizationCount();

  // If user already has workspaces, redirect them to /workspace/new
  // where they can select a plan (including paid plans)
  if (orgCount > 0) {
    redirect("/workspace/new");
  }

  // New users without any workspace see the simple onboarding form
  // This creates a free workspace for first-time users
  return <OnboardingForm />;
}
