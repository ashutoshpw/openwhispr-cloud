interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedNotePage({ params }: PageProps) {
  const { token } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Shared note</h1>
      <p className="text-muted-foreground text-sm">
        Shared note rendering is not wired up yet (token: {token.slice(0, 6)}…).
      </p>
    </main>
  );
}
