import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { leaderboardParticipation } from "@repo/database/schema";
import { z } from "zod";

const participationRequest = z.object({
  enabled: z.boolean(),
  timeZone: z.string().min(1).optional(),
});

/** GET /api/analytics/participation — leaderboard opt-in state. */
export async function GET(request: Request) {
  return withSession(request, async (user) => {
    const [row] = await db()
      .select()
      .from(leaderboardParticipation)
      .where(eq(leaderboardParticipation.userId, user.id))
      .limit(1);

    if (!row) {
      return syncOk({ configured: false, enabled: false, timeZone: "UTC" });
    }
    return syncOk({
      configured: true,
      enabled: row.enabled,
      timeZone: row.timeZone,
    });
  });
}

/** PATCH /api/analytics/participation — upsert the opt-in state. */
export async function PATCH(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = participationRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid participation payload");
    const input = parsed.data;

    const [existing] = await db()
      .select()
      .from(leaderboardParticipation)
      .where(eq(leaderboardParticipation.userId, user.id))
      .limit(1);

    const timeZone = input.timeZone ?? existing?.timeZone ?? "UTC";
    if (existing) {
      await db()
        .update(leaderboardParticipation)
        .set({ enabled: input.enabled, timeZone })
        .where(eq(leaderboardParticipation.id, existing.id));
    } else {
      await db().insert(leaderboardParticipation).values({
        id: crypto.randomUUID(),
        userId: user.id,
        enabled: input.enabled,
        timeZone,
      });
    }

    return syncOk({ configured: true, enabled: input.enabled, timeZone });
  });
}
