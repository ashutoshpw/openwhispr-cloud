import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";

/**
 * GET /api/referrals/invites — sent invites. No referral invite table exists
 * yet, so the list is empty until invites are persisted.
 */
export async function GET(request: Request) {
  return withSession(request, async () => syncOk({ invites: [] }));
}
