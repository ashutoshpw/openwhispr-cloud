import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Mail } from "lucide-react";
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.openwhispr.com";

interface InvitationPreview {
  workspaceName?: string | null;
  email?: string | null;
  role?: string | null;
  inviterEmail?: string | null;
}

async function fetchInvitation(
  token: string,
): Promise<{ invitation: InvitationPreview | null; notFound: boolean }> {
  try {
    const response = await fetch(`${API_URL}/api/invitations/${token}`, {
      cache: "no-store",
    });
    if (response.status === 404) {
      return { invitation: null, notFound: true };
    }
    if (!response.ok) {
      return { invitation: null, notFound: false };
    }
    const invitation = (await response.json()) as InvitationPreview;
    return { invitation, notFound: false };
  } catch {
    return { invitation: null, notFound: false };
  }
}

export const metadata: Metadata = {
  title: "Workspace Invitation — OpenWhispr",
  robots: { index: false },
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { invitation, notFound } = await fetchInvitation(token);

  if (notFound || !invitation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              {notFound
                ? "This invitation is no longer valid."
                : "We couldn't load this invitation right now. Please try again later."}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const workspaceName = invitation.workspaceName ?? "a workspace";
  const role = invitation.role ?? "member";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <Card className="w-full text-center">
        <CardHeader>
          <CardTitle>You&apos;re invited</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{" "}
            <span className="font-medium text-foreground">{workspaceName}</span>{" "}
            on OpenWhispr Cloud as a {role}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {invitation.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              <span>{invitation.email}</span>
            </div>
          )}
          <Button asChild className="w-full">
            {/* Deep link into the desktop app */}
            <a href={`openwhispr://invitations/${token}`}>Open in OpenWhispr</a>
          </Button>
          <p className="text-xs text-muted-foreground">
            If the app doesn&apos;t open, install OpenWhispr and sign in with{" "}
            {invitation.email ?? "the invited email"} first.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
