import { requireOrganizationMembership } from "@/lib/auth/require-membership";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { CreditCard, Settings, Users } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const { organization: org, membership } =
    await requireOrganizationMembership(workspaceSlug);

  const canManage = membership.role === "owner" || membership.role === "admin";

  const links = [
    {
      href: `/dashboard/${workspaceSlug}/~/settings`,
      label: "General settings",
      icon: Settings,
      disabled: false,
    },
    {
      href: `/dashboard/${workspaceSlug}/~/settings/members`,
      label: "Members",
      icon: Users,
      disabled: false,
    },
    {
      href: `/dashboard/${workspaceSlug}/~/settings/billing`,
      label: "Billing",
      icon: CreditCard,
      disabled: !canManage,
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-20 max-w-[800px]">
      <div>
        <h1 className="font-semibold text-3xl tracking-tight">{org.name}</h1>
        <p className="text-muted-foreground mt-1">Workspace overview.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {links.map(({ href, label, icon: Icon, disabled }) => (
          <Card key={href} className={disabled ? "opacity-50" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" disabled={disabled}>
                <Link href={href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
