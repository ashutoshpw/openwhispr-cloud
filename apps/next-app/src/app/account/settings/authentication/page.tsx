import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthenticationPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-20 max-w-[800px]">
      <div>
        <h1 className="text-2xl font-semibold">Authentication</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how you sign in to your account.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Sign-in methods, passkeys, and two-factor authentication will land
            in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            For now, you can continue to sign in using your existing
            email/password or social provider.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
