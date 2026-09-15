import { createHash } from "node:crypto";
import { and, eq, isNull } from "@repo/database";
import { db } from "@repo/database";
import { note, noteShare } from "@repo/database/schema";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Resolve the effective host of this request (Vercel previews included):
 * x-forwarded-host first, then host; strip any port.
 */
async function requestHostname(): Promise<string> {
  const h = await headers();
  const raw = (h.get("x-forwarded-host") ?? h.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return raw.split(":")[0];
}

/**
 * Domain-restricted shares: the request host must equal (or be a subdomain
 * of) one of the comma-separated allowlist entries. Entries may be written
 * with a leading "*." ("*.vercel.app" → "vercel.app"), which also admits any
 * *.vercel.app preview deployment. An empty/unset allowlist is unrestricted
 * so previews keep working before the owner locks the domain down.
 */
async function hostAllowed(allowlist: string | null): Promise<boolean> {
  const hostname = await requestHostname();
  if (!hostname) return false;
  const entries = (allowlist ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase().replace(/^\*\./, ""))
    .filter(Boolean);
  if (entries.length === 0) return true;
  return entries.some(
    (entry) => hostname === entry || hostname.endsWith(`.${entry}`),
  );
}

function LinkErrorView({
  code,
  title,
  message,
}: {
  code: string;
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Badge variant="outline">{code}</Badge>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/">OpenWhispr Notes</Link>
      </Button>
    </main>
  );
}

function formatUpdated(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(at);
}

export default async function SharedNotePage({ params }: PageProps) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const [row] = await db()
    .select({ share: noteShare, note })
    .from(noteShare)
    .innerJoin(note, eq(noteShare.noteId, note.id))
    .where(
      and(
        eq(noteShare.tokenHash, tokenHash),
        eq(noteShare.isActive, true),
        isNull(note.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return (
      <LinkErrorView
        code="404"
        title="Link not found or revoked"
        message="This share link doesn't exist, was revoked by its owner, or the note was deleted."
      />
    );
  }

  if (row.share.visibility === "domain") {
    const allowed = await hostAllowed(row.share.domainAllowlist);
    if (!allowed) {
      return (
        <LinkErrorView
          code="403"
          title="Restricted link"
          message="This link is restricted to specific domains."
        />
      );
    }
  }

  const { note: shared } = row;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <Badge className="w-fit" variant="secondary">
          Shared note
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          {shared.title || "Untitled note"}
        </h1>
      </header>

      <article className="flex flex-col gap-8">
        <section className="text-base leading-7 [overflow-wrap:break-word] whitespace-pre-wrap">
          {shared.content}
        </section>

        {shared.enhancedContent ? (
          <section className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-6">
            <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Enhanced
            </h2>
            <div className="text-base leading-7 [overflow-wrap:break-word] whitespace-pre-wrap">
              {shared.enhancedContent}
            </div>
          </section>
        ) : null}
      </article>

      <footer className="text-muted-foreground border-t pt-6 text-xs">
        Last updated {formatUpdated(shared.updatedAt)} ·{" "}
        <Link href="/" className="underline">
          OpenWhispr
        </Link>
      </footer>
    </main>
  );
}
