import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";

/**
 * POST /api/gemini-live-token — Gemini Live access for the desktop.
 *
 * A full service-account OAuth mint is not wired up; when a GEMINI_API_KEY is
 * present it is handed through as a single-use token (the desktop mints one
 * per socket, uses: 1 — realtimeTokenProviders.js).
 */

export async function POST(request: Request) {
  return withSession(request, async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return syncError(503, "Provider not configured");
    }
    return syncOk({ token: apiKey, uses: 1 });
  });
}
