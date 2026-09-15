import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { and, eq, inArray } from "@repo/database";
import { analyticsDaily } from "@repo/database/schema";
import { z } from "zod";

const summaryQuery = z.object({
  timeZone: z.string().min(1).default("UTC"),
  backfill: z.coerce.number().int().min(1).max(366).optional(),
});

type DayBucket = {
  date: string;
  words: number;
  dictations: number;
  spokenDurationMs: number;
};

/** Calendar date (YYYY-MM-DD) in the requested zone; falls back to UTC. */
function zonedDateParts(timeZone: string, instant: number) {
  try {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(instant));
    const [year, month, day] = formatted.split("-").map(Number);
    return { year, month, day };
  } catch {
    const formatted = new Date(instant).toISOString().slice(0, 10);
    const [year, month, day] = formatted.split("-").map(Number);
    return { year, month, day };
  }
}

function dateFromParts(parts: {
  year: number;
  month: number;
  day: number;
}): string {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
    .toISOString()
    .slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return dateFromParts({ year, month, day: day + days });
}

function currentStreak(days: DayBucket[]): number {
  if (days.length === 0) return 0;
  let index = days.length - 1;
  if (days[index].dictations <= 0) index -= 1;
  let streak = 0;
  while (index >= 0 && days[index].dictations > 0) {
    streak += 1;
    index -= 1;
  }
  return streak;
}

function longestStreak(days: DayBucket[]): number {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    if (day.dictations > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return longest;
}

/**
 * GET /api/analytics/summary — daily aggregates for the last N days (default
 * 366) in the caller's timezone. Missing days are reported as zeroed buckets.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = summaryQuery.safeParse(params);

  return withSession(request, async (user) => {
    if (!parsed.success) return syncError(400, "Invalid summary query");
    const { timeZone, backfill } = parsed.data;

    const today = dateFromParts(zonedDateParts(timeZone, Date.now()));
    const days = backfill ?? 366;
    const dates: string[] = [];
    for (let offset = 0; offset < days; offset += 1) {
      dates.push(shiftDate(today, -offset));
    }
    dates.reverse();

    const rows = await db()
      .select()
      .from(analyticsDaily)
      .where(
        and(
          eq(analyticsDaily.userId, user.id),
          inArray(analyticsDaily.date, dates),
        ),
      );
    const byDate = new Map(rows.map((row) => [row.date, row]));

    const daily: DayBucket[] = dates.map((date) => {
      const row = byDate.get(date);
      return {
        date,
        words: row?.words ?? 0,
        dictations: row?.dictations ?? 0,
        spokenDurationMs: row?.spokenDurationMs ?? 0,
      };
    });

    return syncOk({
      totalWords: daily.reduce((sum, day) => sum + day.words, 0),
      totalDictations: daily.reduce((sum, day) => sum + day.dictations, 0),
      totalSpokenDurationMs: daily.reduce(
        (sum, day) => sum + day.spokenDurationMs,
        0,
      ),
      currentStreakDays: currentStreak(daily),
      longestStreakDays: longestStreak(daily),
      averageWpm: 0,
      wpmCoveragePercent: 0,
      daily,
      historyBackfillRetryRequired: false,
    });
  });
}
