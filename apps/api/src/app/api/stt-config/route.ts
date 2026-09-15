import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";

/**
 * GET /api/stt-config — cloud STT routing config; opaque JSON contract the
 * desktop reads as provider knobs.
 */
export async function GET(request: Request) {
  return withSession(request, async () => {
    return syncOk({
      provider: process.env.STT_PROVIDER_DEFAULT ?? null,
      streamingEnabled: process.env.STT_STREAMING_ENABLED === "true",
    });
  });
}
