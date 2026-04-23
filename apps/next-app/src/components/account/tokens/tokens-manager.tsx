"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, Loader2, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type CreatedToken = {
  plaintext: string;
  token: TokenRow;
};

const EXPIRATIONS = [
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "60d", label: "60 days" },
  { value: "90d", label: "90 days" },
  { value: "180d", label: "180 days" },
  { value: "1y", label: "1 year" },
  { value: "never", label: "Never" },
] as const;

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function relativeOrNever(value: string | null): string {
  if (!value) return "Never";
  const diffMs = Date.now() - new Date(value).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function TokensManager() {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("full");
  const [expiration, setExpiration] = useState<string>("30d");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/account/tokens");
    if (res.ok) {
      const data = await res.json();
      setTokens(data.tokens);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/account/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scope, expiration }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create token");
        return;
      }
      const data = (await res.json()) as CreatedToken;
      setCreated(data);
      setName("");
      setExpiration("30d");
      await refresh();
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setPendingDelete(id);
    try {
      await fetch(`/api/account/tokens/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setPendingDelete(null);
    }
  };

  const copyToken = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Create Token</CardTitle>
          <CardDescription>
            Tokens grant full access to your account via the API and MCP server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div className="md:col-span-3">
              <Label htmlFor="token-name" className="text-xs uppercase">
                Token Name
              </Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Local development"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="token-scope" className="text-xs uppercase">
                Scope
              </Label>
              <select
                id="token-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="full">Full Account</option>
              </select>
            </div>
            <div>
              <Label htmlFor="token-expiration" className="text-xs uppercase">
                Expiration
              </Label>
              <select
                id="token-expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {EXPIRATIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
            {error ? (
              <p className="md:col-span-3 text-sm text-destructive">{error}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Tokens</CardTitle>
          <CardDescription>
            Revoke any token that has been compromised or is no longer in use.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tokens === null ? (
            <div className="flex items-center justify-center px-6 py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : tokens.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">
              No tokens yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-2 text-left font-medium">Name</th>
                  <th className="px-6 py-2 text-left font-medium">Scope</th>
                  <th className="px-6 py-2 text-left font-medium">Expires</th>
                  <th className="px-6 py-2 text-left font-medium">
                    Last Active
                  </th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {tokens.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {t.tokenPrefix}…
                      </div>
                    </td>
                    <td className="px-6 py-3 capitalize">{t.scope}</td>
                    <td className="px-6 py-3">{formatDate(t.expiresAt)}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {relativeOrNever(t.lastUsedAt)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pendingDelete === t.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRevoke(t.id)}
                          >
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={created !== null}
        onOpenChange={(open) => {
          if (!open) setCreated(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token created</DialogTitle>
            <DialogDescription>
              Copy this token now. For security reasons, it will not be shown
              again.
            </DialogDescription>
          </DialogHeader>
          {created ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm">
              <span className="flex-1 truncate">{created.plaintext}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyToken}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-3 w-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" /> Copy
                  </>
                )}
              </Button>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
