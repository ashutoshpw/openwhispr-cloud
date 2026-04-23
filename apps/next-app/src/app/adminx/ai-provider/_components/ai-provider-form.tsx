"use client";

import { Button } from "@/components/ui/button";
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
};

interface Props {
  initial: Initial;
}

export function AiProviderForm({ initial }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);

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

      const res = await fetch("/api/admin/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Save failed");
      toast.success("AI provider settings saved");
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
      const res = await fetch("/api/admin/ai-provider", { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Failed to clear key");
      toast.success("API key cleared");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear key");
    } finally {
      setClearing(false);
    }
  }

  const keyPlaceholder = initial.hasApiKey
    ? `sk-••••••••${initial.apiKeyLast4 ?? ""} (leave blank to keep)`
    : "sk-…";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="baseUrl">Base URL</Label>
        <Input
          id="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
        <p className="text-xs text-muted-foreground">
          Optional. Leave blank to use the provider default. Any
          OpenAI-compatible endpoint works (e.g. Azure, vLLM, Groq).
        </p>
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
              : "Not configured."}
          </p>
          {initial.hasApiKey && (
            <button
              type="button"
              onClick={handleClearKey}
              disabled={clearing}
              className="text-xs text-destructive hover:underline"
            >
              {clearing ? "Clearing…" : "Clear key"}
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
          placeholder="gpt-4o-mini"
        />
        <p className="text-xs text-muted-foreground">
          Used when an agent doesn&apos;t specify its own model.
        </p>
      </div>

      <div>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
