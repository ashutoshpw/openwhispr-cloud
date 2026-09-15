import { withSession } from "@/lib/session";
import { syncCreated, syncError } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { onboardingIntent } from "@repo/database/schema";
import { z } from "zod";

const intentRequest = z.object({
  useCases: z.array(z.string()).nullish(),
  note: z.string().nullish(),
  spokenLanguages: z.array(z.string()).nullish(),
});

/** POST /api/onboarding-intent — fire-and-forget onboarding telemetry. */
export async function POST(request: Request) {
  return withSession(request, async (user) => {
    const body = await request.json().catch(() => null);
    const parsed = intentRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid payload");

    await db()
      .insert(onboardingIntent)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        useCases: parsed.data.useCases ?? null,
        note: parsed.data.note ?? null,
        spokenLanguages: parsed.data.spokenLanguages ?? null,
      });
    return syncCreated({ ok: true });
  });
}
