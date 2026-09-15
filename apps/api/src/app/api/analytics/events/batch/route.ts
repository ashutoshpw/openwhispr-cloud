import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq, inArray } from "@repo/database";
import { analyticsEvent } from "@repo/database/schema";
import { z } from "zod";

const eventInput = z.object({
  client_event_id: z.string().min(1).max(255).optional(),
  event_type: z.string().min(1).max(100),
  words: z.number().int().min(0).optional(),
  spoken_duration_ms: z.number().int().min(0).optional(),
  counter_version: z.number().int().min(0).optional(),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const batchRequest = z.object({
  events: z.array(z.unknown()).min(1).max(500),
});

/**
 * POST /api/analytics/events/batch — per-event validation (invalid events are
 * rejected by index, valid ones accepted), idempotent on client_event_id.
 */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = batchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid events payload");

    const rejected: { index: number; reason: string }[] = [];
    const rows: { index: number; row: typeof analyticsEvent.$inferInsert }[] =
      [];
    parsed.data.events.forEach((raw, index) => {
      const result = eventInput.safeParse(raw);
      if (!result.success) {
        rejected.push({
          index,
          reason: result.error.issues[0]?.message ?? "Invalid event",
        });
        return;
      }
      const event = result.data;
      rows.push({
        index,
        row: {
          id: crypto.randomUUID(),
          clientEventId: event.client_event_id ?? null,
          userId: user.id,
          eventType: event.event_type,
          words: event.words ?? null,
          spokenDurationMs: event.spoken_duration_ms ?? null,
          counterVersion: event.counter_version ?? null,
          occurredAt: event.occurred_at
            ? new Date(event.occurred_at)
            : new Date(),
          metadata: event.metadata ?? null,
        },
      });
    });

    // Events already stored (by client_event_id) keep their original row.
    const existingByClientId = new Map<string, string>();
    const clientIds = rows
      .map((entry) => entry.row.clientEventId)
      .filter((id): id is string => id !== null);
    if (clientIds.length > 0) {
      const existing = await db()
        .select({
          id: analyticsEvent.id,
          clientEventId: analyticsEvent.clientEventId,
        })
        .from(analyticsEvent)
        .where(
          and(
            eq(analyticsEvent.userId, user.id),
            inArray(analyticsEvent.clientEventId, clientIds),
          ),
        );
      for (const row of existing) {
        if (row.clientEventId)
          existingByClientId.set(row.clientEventId, row.id);
      }
    }

    const fresh = rows.filter(
      (entry) =>
        !entry.row.clientEventId ||
        !existingByClientId.has(entry.row.clientEventId),
    );
    if (fresh.length > 0) {
      await db()
        .insert(analyticsEvent)
        .values(fresh.map((entry) => entry.row))
        .onConflictDoNothing();
    }

    const accepted = rows.map(
      (entry) =>
        (entry.row.clientEventId &&
          existingByClientId.get(entry.row.clientEventId)) ||
        entry.row.id,
    );

    return syncOk({
      accepted,
      rejected,
      supportsHistoricalCounterVersion: true,
    });
  });
}
