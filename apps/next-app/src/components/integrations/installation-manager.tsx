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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  Integration,
  IntegrationInstallation,
} from "@repo/database/schema";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface InstallationManagerProps {
  installation: Omit<IntegrationInstallation, "configEncrypted"> & {
    hasSecret?: boolean;
  };
  integration: Integration;
  /** Where to send the user after uninstall */
  postDeleteHref: string;
}

export function InstallationManager({
  installation,
  integration,
  postDeleteHref,
}: InstallationManagerProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    installation.displayName ?? integration.name,
  );
  const [savedName, setSavedName] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    displayName.trim() !== savedName && displayName.trim().length > 0;

  async function handleSaveName() {
    setSavingName(true);
    try {
      const res = await fetch(`/api/installations/${installation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Update failed");
      }
      setSavedName(displayName.trim());
      toast.success("Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingName(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch(`/api/installations/${installation.id}/verify`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error ?? "Verification failed");
      }
      toast.success("Verified");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/installations/${installation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Uninstall failed");
      }
      toast.success("Uninstalled");
      router.push(postDeleteHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uninstall failed");
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 max-w-[800px]">
      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
          <CardDescription>
            How this installation appears in lists and selectors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="displayName" className="sr-only">
            Display name
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveName} disabled={!dirty || savingName}>
            {savingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            Current status:{" "}
            <span className="font-medium text-foreground">
              {installation.status}
            </span>
            {installation.lastError && (
              <span className="block text-destructive mt-1">
                {installation.lastError}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={handleVerify} disabled={verifying}>
            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Re-verify
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public configuration</CardTitle>
          <CardDescription>
            Non-sensitive fields stored for this installation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md border bg-muted p-3 text-xs overflow-x-auto">
            {JSON.stringify(installation.configPublic ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Removing this installation cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                Uninstall
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Uninstall {integration.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Encrypted credentials will be deleted. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Uninstall
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
