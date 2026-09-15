export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">OpenWhispr MCP</h1>
      <p className="text-muted-foreground text-sm">
        Connect any MCP client to this server&apos;s <code>/mcp</code> endpoint
        using the Streamable HTTP transport. Every request is authenticated with
        an OpenWhispr API key.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Endpoint</h2>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
          <code>{"POST /mcp"}</code>
        </pre>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Authentication</h2>
        <p className="text-muted-foreground text-sm">
          Send your key in the <code>Authorization</code> header on every
          request. Personal keys use the <code>owk_live_</code> prefix;
          workspace keys use <code>ow_wks_live_</code>.
        </p>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
          <code>{"Authorization: Bearer owk_live_xxxxxxxxxxxxxxxx"}</code>
        </pre>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
          <code>{"Authorization: Bearer ow_wks_live_xxxxxxxxxxxxxxxx"}</code>
        </pre>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Tools</h2>
        <ul className="text-muted-foreground list-inside list-disc text-sm">
          <li>
            <code>notes_list</code> — list notes (workspace keys must pass{" "}
            <code>space_id</code>)
          </li>
          <li>
            <code>notes_get</code> — fetch one note by id
          </li>
          <li>
            <code>notes_search</code> — search titles and content
          </li>
          <li>
            <code>notes_create</code> — create a note
          </li>
          <li>
            <code>usage_get</code> — current word-usage period
          </li>
        </ul>
      </section>
    </main>
  );
}
