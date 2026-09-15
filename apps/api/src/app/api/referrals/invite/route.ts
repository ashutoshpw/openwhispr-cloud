import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { z } from "zod";

const inviteRequest = z.object({
  email: z.string().email(),
});

/**
 * POST /api/referrals/invite — records intent to invite. No referral invite
 * table exists yet, so this acknowledges the request without storing it.
 */
export async function POST(request: Request) {
  return withSession(request, async () => {
    const body = await request.json().catch(() => null);
    const parsed = inviteRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid invite payload");

    return syncOk({ invited: true });
  });
}
