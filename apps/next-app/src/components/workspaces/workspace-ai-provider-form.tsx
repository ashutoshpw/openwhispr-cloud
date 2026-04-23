"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Initial = {
  baseUrl: string | null;
  apiKeyLast4: string | null;
  hasApiKey: boolean;
  defaultModel: string | null;
  hasOrgOverride: boolean;
};

type TestResult =
  | {
      ok: true;
      url: string;
      modelCount: number | null;
      source: "org" | "global";
    }
  | {
      ok: false;
      error: string;
      url?: string;
      status?: number;
      source?: "org" | "global";
    };

interface Props {
  organizationId: string;
  initial: Initial;
}

export function WorkspaceAiProviderForm({ organizationId, initial }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState(initial.defaultModel ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        baseUrl: baseUrl.trim() || null,
        defaultModel: defaultModel.trim() || null,
      };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const res = await fetch(
        `/api/organizations/${organizationId}/ai-provider`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Save failed");
      toast.success("Workspace AI provider saved");
      setApiKey("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClearKey() {
    setClearing(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/ai-provider`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clearApiKey: true }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Failed to clear key");
      toast.success("Workspace API key cleared");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear key");
    } finally {
      setClearing(false);
    }
  }

  async function handleResetAll() {
    if (
      !confirm(
        "Remove all workspace overrides? Agents will fall back to the platform-wide provider.",
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/ai-provider`,
        { method: "DELETE" },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Failed to reset");
      toast.success("Overrides removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setClearing(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/ai-provider`,
        { method: "PUT" },
      );
      const raw = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok && typeof raw.ok !== "boolean") {
        throw new Error(
          typeof raw.error === "string" ? raw.error : "Test failed",
        );
      }
      const payload = raw as unknown as TestResult;
      setTestResult(payload);
      if (payload.ok) toast.success("Connection OK");
      else toast.error(payload.error || "Connection failed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test failed";
      setTestResult({ ok: false, error: message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  }

  const keyPlaceholder = initial.hasApiKey
    ? `sk-••••••••${initial.apiKeyLast4 ?? ""} (leave blank to keep)`
    : "Use platform key (leave blank) or paste sk-…";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">OpenAI configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Leave blank to use platform default"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyPlaceholder}
              autoComplete="off"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {initial.hasApiKey
                  ? "Stored encrypted. Leave blank to keep the current key."
                  : "Not set — agents will use the platform-wide key."}
              </p>
              {initial.hasApiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  disabled={clearing}
                  className="text-xs text-destructive hover:underline"
                >
                  {clearing ? "Clearing…" : "Clear workspace key"}
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="defaultModel">Default model</Label>
            <Input
              id="defaultModel"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              placeholder="Leave blank to use platform default"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save overrides
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test connection
            </Button>
            {initial.hasOrgOverride && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetAll}
                disabled={clearing}
                className="ml-auto text-destructive hover:text-destructive"
              >
                Reset all overrides
              </Button>
            )}
          </div>

          {testResult && (
            <div
              className={
                testResult.ok
                  ? "rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
                  : "rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              }
            >
              {testResult.ok ? (
                <>
                  <div className="font-medium">
                    Connection OK
                    <span className="ml-1 text-xs opacity-70">
                      (using {testResult.source} config)
                    </span>
                  </div>
                  <div className="text-xs opacity-80">
                    {testResult.url}
                    {testResult.modelCount !== null
                      ? ` · ${testResult.modelCount} models returned`
                      : ""}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium">
                    Connection failed
                    {testResult.status ? ` (HTTP ${testResult.status})` : ""}
                  </div>
                  <div className="break-words text-xs opacity-80">
                    {testResult.error}
                  </div>
                </>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
