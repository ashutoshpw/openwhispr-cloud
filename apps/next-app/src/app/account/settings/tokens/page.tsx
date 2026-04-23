import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TokensPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-20 max-w-[800px]">
      <div>
        <h1 className="text-2xl font-semibold">Tokens</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personal API tokens for hitting the public API and MCP server.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Personal API tokens will land in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You'll be able to create scoped tokens for hitting public endpoints
            and authenticating with the MCP server.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
