"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  "outreach",
  "research",
  "support",
  "sales",
  "other",
] as const;
const STATUSES = ["active", "beta", "deprecated", "hidden"] as const;

export type AgentFormInitial = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  category?: string;
  iconUrl?: string | null;
  docsUrl?: string | null;
  status?: string;
  isSystemManaged?: boolean;
  systemPrompt?: string | null;
  model?: string | null;
  temperature?: number | null;
  configSchema?: unknown;
  metadata?: unknown;
};

interface Props {
  mode: "create" | "edit";
  initial?: AgentFormInitial;
}

export function AgentForm({ mode, initial }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "other");
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl ?? "");
  const [docsUrl, setDocsUrl] = useState(initial?.docsUrl ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [isSystemManaged, setIsSystemManaged] = useState(
    initial?.isSystemManaged ?? false,
  );
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [temperature, setTemperature] = useState(
    initial?.temperature != null ? String(initial.temperature) : "",
  );
  const [configSchemaText, setConfigSchemaText] = useState(
    initial?.configSchema
      ? JSON.stringify(initial.configSchema, null, 2)
      : "{}",
  );
  const [metadataText, setMetadataText] = useState(
    initial?.metadata ? JSON.stringify(initial.metadata, null, 2) : "{}",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let configSchema: unknown = null;
      let metadata: unknown = null;
      try {
        configSchema = configSchemaText.trim()
          ? JSON.parse(configSchemaText)
          : null;
      } catch {
        throw new Error("configSchema must be valid JSON");
      }
      try {
        metadata = metadataText.trim() ? JSON.parse(metadataText) : null;
      } catch {
        throw new Error("metadata must be valid JSON");
      }

      let temperatureValue: number | null = null;
      if (temperature.trim()) {
        const parsed = Number(temperature);
        if (!Number.isFinite(parsed)) {
          throw new Error("temperature must be a number");
        }
        temperatureValue = parsed;
      }

      const body = {
        ...(mode === "create" ? { slug } : {}),
        name,
        description: description || null,
        category,
        iconUrl: iconUrl || null,
        docsUrl: docsUrl || null,
        status,
        isSystemManaged,
        systemPrompt: systemPrompt || null,
        model: model || null,
        temperature: temperatureValue,
        configSchema,
        metadata,
      };

      const url =
        mode === "create"
          ? "/api/admin/agents"
          : `/api/admin/agents/${initial?.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "Save failed");
      }
      toast.success(mode === "create" ? "Agent created" : "Saved");
      if (mode === "create") {
        router.push(`/adminx/agents/${payload.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/agents/${initial.id}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Delete failed");
      toast.success("Agent deleted");
      router.push("/adminx/agents");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={mode === "edit"}
          required
          pattern="[a-z0-9-]+"
          placeholder="outreach-writer"
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, and dashes. Cannot be changed after
          creation.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="systemPrompt">System prompt</Label>
        <Textarea
          id="systemPrompt"
          value={systemPrompt ?? ""}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          placeholder="You are a helpful assistant that…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={model ?? ""}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini (leave blank to use default)"
          />
          <p className="text-xs text-muted-foreground">
            Overrides the global OPENAI_DEFAULT_MODEL when set.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="0.7"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="iconUrl">Icon URL</Label>
          <Input
            id="iconUrl"
            value={iconUrl ?? ""}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="docsUrl">Docs URL</Label>
          <Input
            id="docsUrl"
            value={docsUrl ?? ""}
            onChange={(e) => setDocsUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isSystemManaged}
          onChange={(e) => setIsSystemManaged(e.target.checked)}
        />
        System managed (cannot be removed by users)
      </label>

      <div className="grid gap-1.5">
        <Label htmlFor="configSchema">Config schema (JSON)</Label>
        <Textarea
          id="configSchema"
          value={configSchemaText}
          onChange={(e) => setConfigSchemaText(e.target.value)}
          rows={8}
          className="font-mono text-xs"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="metadata">Metadata (JSON)</Label>
        <Textarea
          id="metadata"
          value={metadataText}
          onChange={(e) => setMetadataText(e.target.value)}
          rows={6}
          className="font-mono text-xs"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create" : "Save changes"}
        </Button>

        {mode === "edit" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );
}
