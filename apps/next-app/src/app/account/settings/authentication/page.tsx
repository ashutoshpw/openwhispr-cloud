import { ActiveSessionsCard } from "@/components/account/authentication/active-sessions-card";
import { SignInMethodsCard } from "@/components/account/authentication/sign-in-methods-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth/require-membership";
import { db, eq } from "@repo/database";
import { account } from "@repo/database/schema";

export const dynamic = "force-dynamic";

export default async function AuthenticationPage() {
  const { user } = await requireSession("/account/settings/authentication");

  const accounts = await db()
    .select({
      id: account.id,
      providerId: account.providerId,
      accountId: account.accountId,
      createdAt: account.createdAt,
    })
    .from(account)
    .where(eq(account.userId, user.id));

  const linked = {
    email: accounts.some((a) => a.providerId === "credential"),
    google: accounts.some((a) => a.providerId === "google"),
    github: accounts.some((a) => a.providerId === "github"),
  };

  const googleEnabled = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET,
  );
  const githubEnabled = Boolean(
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET,
  );

  return (
    <div className="flex max-w-[800px] flex-col gap-6 px-4 pt-5 pb-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Authentication
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how you sign in to your account.
        </p>
      </div>

      <SignInMethodsCard
        email={user.email}
        linked={linked}
        googleEnabled={googleEnabled}
        githubEnabled={githubEnabled}
      />

      <ActiveSessionsCard />

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Passkeys and authenticator app (TOTP) support are coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Two-factor protection will land in a follow-up release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
