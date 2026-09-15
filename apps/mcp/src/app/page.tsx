export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-2 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">OpenWhispr MCP</h1>
      <p className="text-muted-foreground text-sm">
        Connect an MCP client to <code>/mcp</code> with an API key.
      </p>
    </main>
  );
}
