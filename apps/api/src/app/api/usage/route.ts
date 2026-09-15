import { withSession } from "@/lib/session";
import { getUsageSnapshot } from "@/lib/usage";
import { syncOk } from "@repo/api-schemas/envelope";

export async function GET(request: Request) {
  return withSession(request, async (user) => {
    return syncOk(await getUsageSnapshot(user.id));
  });
}
