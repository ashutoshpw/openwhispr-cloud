import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentForm } from "../_components/agent-form";

export default function NewAgentPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">New agent</h1>
        <p className="text-sm text-muted-foreground">
          Add a new AI agent to the registry.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AgentForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
