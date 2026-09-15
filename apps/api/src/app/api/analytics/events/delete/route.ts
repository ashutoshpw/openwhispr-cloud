import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq, inArray, lte } from "@repo/database";
import { analyticsEvent } from "@repo/database/schema";
import { z } from "zod";

const deleteRequest = z
  .object({
    eventIds: z.array(z.string().min(1)).min(1).optional(),
    deleteAll: z.boolean().optional(),
    clearedThrough: z.string().datetime({ offset: true }).optional(),
  })
  .refine(
    (input) => input.deleteAll === true || (input.eventIds?.length ?? 0) > 0,
    {
      message: "eventIds or deleteAll is required",
    },
  );

/**
 * DELETE /api/analytics/events/delete — removes the session user's events by
 * id, or everything up to clearedThrough when deleteAll is set.
 */
export async function DELETE(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = deleteRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid delete payload");
    const input = parsed.data;

    const where = input.deleteAll
      ? and(
          eq(analyticsEvent.userId, user.id),
          input.clearedThrough
            ? lte(analyticsEvent.occurredAt, new Date(input.clearedThrough))
            : undefined,
        )
      : and(
          eq(analyticsEvent.userId, user.id),
          inArray(analyticsEvent.id, input.eventIds as string[]),
        );

    const deleted = await db()
      .delete(analyticsEvent)
      .where(where)
      .returning({ id: analyticsEvent.id });

    return syncOk({ deleted: deleted.length });
  });
}
