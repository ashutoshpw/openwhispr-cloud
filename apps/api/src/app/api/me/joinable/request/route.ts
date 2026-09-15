import { withSession } from "@/lib/session";
import { syncCreated, syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq } from "@repo/database";
import { joinRequest } from "@repo/database/schema";
import { z } from "zod";

/** POST /api/me/joinable/request { workspace_id } — request to join. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = z.object({ workspace_id: z.string() }).safeParse(body);
    if (!parsed.success) return syncError(400, "workspace_id is required");
    const wid = parsed.data.workspace_id;

    const [existing] = await db()
      .select({ id: joinRequest.id, status: joinRequest.status })
      .from(joinRequest)
      .where(
        and(
          eq(joinRequest.organizationId, wid),
          eq(joinRequest.userId, user.id),
        ),
      )
      .limit(1);
    if (existing) {
      return syncOk({ id: existing.id, status: existing.status });
    }

    const [row] = await db()
      .insert(joinRequest)
      .values({
        id: crypto.randomUUID(),
        organizationId: wid,
        userId: user.id,
        status: "pending",
      })
      .returning({ id: joinRequest.id, status: joinRequest.status });
    return syncCreated(row);
  });
}
