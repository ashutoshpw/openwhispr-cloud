import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";

/**
 * POST /api/streaming-token — short-lived AssemblyAI streaming token.
 *
 * The desktop reads { token } (realtimeTokenProviders.js).
 */

export async function POST(request: Request) {
  return withSession(request, async () => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return syncError(503, "Provider not configured");
    }
    try {
      const response = await fetch(
        "https://api.assemblyai.com/v2/token?expires_in_seconds=60",
        { method: "POST", headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!response.ok) {
        return syncError(
          503,
          `AssemblyAI token request failed: ${response.status}`,
        );
      }
      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        return syncError(503, "No AssemblyAI token received");
      }
      return syncOk({ token: data.token });
    } catch {
      return syncError(503, "AssemblyAI token request failed");
    }
  });
}
