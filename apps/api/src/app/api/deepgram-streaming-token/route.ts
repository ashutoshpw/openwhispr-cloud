import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";

/**
 * POST /api/deepgram-streaming-token — short-lived Deepgram streaming token.
 *
 * The desktop reads { token } (realtimeTokenProviders.js).
 */

export async function POST(request: Request) {
  return withSession(request, async () => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return syncError(503, "Provider not configured");
    }
    try {
      const response = await fetch(
        "https://api.deepgram.com/v1/auth/generate_token",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      if (!response.ok) {
        return syncError(
          503,
          `Deepgram token request failed: ${response.status}`,
        );
      }
      const data = (await response.json()) as { access_token?: string };
      if (!data.access_token) {
        return syncError(503, "No Deepgram token received");
      }
      return syncOk({ token: data.access_token });
    } catch {
      return syncError(503, "Deepgram token request failed");
    }
  });
}
