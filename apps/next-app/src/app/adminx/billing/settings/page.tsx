import { AppSettingsManager } from "@/components/admin/billing";

export default function AppSettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">App Settings</h1>
        <p className="text-muted-foreground">
          Configure application-wide billing and feature settings.
        </p>
      </div>
      <AppSettingsManager />
    </div>
  );
}
