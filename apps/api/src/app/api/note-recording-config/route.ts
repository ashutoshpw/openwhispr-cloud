import { withSession } from "@/lib/session";
import { syncOk } from "@repo/api-schemas/envelope";

/** GET /api/note-recording-config — meeting recording behavior knobs. */
export async function GET(request: Request) {
  return withSession(request, async () => {
    return syncOk({
      maxRecordingSeconds: Number(
        process.env.NOTE_RECORDING_MAX_SECONDS ?? 14400,
      ),
      preRollSeconds: Number(process.env.NOTE_PRE_ROLL_SECONDS ?? 3),
    });
  });
}
