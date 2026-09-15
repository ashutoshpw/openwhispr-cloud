import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-2 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        OpenWhispr Notes
      </h1>
      <p className="text-muted-foreground text-sm">
        Shared notes live at <code>/n/{"{token}"}</code>.{" "}
        <Link href="https://openwhispr.com" className="underline">
          Back to OpenWhispr
        </Link>
      </p>
    </main>
  );
}
