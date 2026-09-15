import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { eq, inArray } from "@repo/database";
import { member, organization } from "@repo/database/schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect(
      `${process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.openwhispr.com"}/auth/sign-in`,
    );
  }

  // Get user's organizations
  const userMembers = await db()
    .select()
    .from(member)
    .where(eq(member.userId, session.user.id));

  if (userMembers.length === 0) {
    redirect(
      `${process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.openwhispr.com"}/auth/onboarding`,
    );
  }

  const organizationIds = userMembers.map((m) => m.organizationId);

  const organizations = await db()
    .select()
    .from(organization)
    .where(inArray(organization.id, organizationIds))
    .limit(1);

  if (organizations.length === 0) {
    redirect(
      `${process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.openwhispr.com"}/auth/onboarding`,
    );
  }

  // Redirect to the first workspace
  redirect(`/dashboard/${organizations[0].slug}`);
}
