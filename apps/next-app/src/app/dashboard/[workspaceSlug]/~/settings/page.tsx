import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@repo/auth/server";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { member, organization } from "@repo/database/schema";
import { CreditCard, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceSettings({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect(`/auth/sign-in?redirect=/dashboard/${workspaceSlug}/~/settings`);
  }

  // Get organization by slug
  const org = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, workspaceSlug))
    .limit(1);

  if (!org[0]) {
    notFound();
  }

  // Check user membership
  const membership = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, org[0].id),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership[0]) {
    notFound();
  }

  const user = session.user;

  return (
    <div className="flex flex-wrap justify-start items-center gap-4 px-4 pt-5">
      <div className="flex flex-col gap-3 mb-20 w-full max-w-[700px]">
        <h2 className="mt-10 first:mt-0 pb-2 border-b w-full font-semibold text-3xl tracking-tight transition-colors scroll-m-20">
          Workspace Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your workspace settings, members, and billing.
        </p>

        {/* Quick links */}
        <div className="flex gap-2 mt-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${workspaceSlug}/~/settings/members`}>
              <Users className="h-4 w-4 mr-2" />
              Members
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${workspaceSlug}/~/settings/billing`}>
              <CreditCard className="h-4 w-4 mr-2" />
              Billing & Subscription
            </Link>
          </Button>
        </div>

        <h3 className="mt-8 pb-2 border-b w-full font-semibold text-xl tracking-tight scroll-m-20">
          My Profile
        </h3>
        <div className="flex gap-3 mt-3 w-full">
          <div className="flex flex-col gap-3 w-full">
            <Label>Name</Label>
            <Input disabled defaultValue={user?.name || ""} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Label>E-mail</Label>
            <Input disabled defaultValue={user?.email || ""} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Label>Email Verified</Label>
            <Input disabled defaultValue={user?.emailVerified ? "Yes" : "No"} />
          </div>
        </div>

        <h3 className="mt-8 pb-2 border-b w-full font-semibold text-xl tracking-tight scroll-m-20">
          Workspace Info
        </h3>
        <div className="flex gap-3 mt-3 w-full">
          <div className="flex flex-col gap-3 w-full">
            <Label>Workspace Name</Label>
            <Input disabled defaultValue={org[0].name || ""} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Label>Workspace Slug</Label>
            <Input disabled defaultValue={org[0].slug || ""} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Label>Your Role</Label>
            <Input
              disabled
              defaultValue={membership[0].role || ""}
              className="capitalize"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
