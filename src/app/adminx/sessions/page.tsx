import { SessionTable } from "@/components/admin/SessionTable";
import { db } from "@/lib/db";
import { session } from "@/lib/db/schema";

async function getSessions() {
  try {
    const sessions = await db()
      .select()
      .from(session)
      .orderBy(session.createdAt);
    return sessions;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

export default async function SessionsPage() {
  const sessions = await getSessions();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Session Management</h1>
        <p className="text-muted-foreground">
          View and manage active user sessions
        </p>
      </div>
      <SessionTable sessions={sessions} />
    </div>
  );
}

