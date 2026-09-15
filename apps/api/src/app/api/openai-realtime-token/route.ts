import { withSession } from "@/lib/session";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { z } from "zod";

/**
 * POST /api/openai-realtime-token — OpenAI Realtime session client secrets.
 *
 * The desktop sends { model, language, streams } and reads { clientSecret },
 * or { clientSecrets: [...] } when streams > 1 (one minted session per
 * stream; realtimeTokenProviders.js).
 */

const payloadSchema = z.object({
  model: z.string().optional(),
  language: z.string().optional(),
  streams: z.number().int().min(1).max(4).optional(),
});

const DEFAULT_REALTIME_MODEL = "gpt-4o-transcribe";

function extractClientSecret(json: unknown): string | null {
  const secret = (json as { client_secret?: { value?: string } | string })
    ?.client_secret;
  if (typeof secret === "string") return secret;
  return secret?.value ?? null;
}

export async function POST(request: Request) {
  return withSession(request, async () => {
    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return syncError(400, "Invalid token request");
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return syncError(503, "Provider not configured");
    }

    const { model, language, streams } = parsed.data;
    const mint = async (): Promise<string> => {
      const response = await fetch(
        "https://api.openai.com/v1/realtime/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model ?? DEFAULT_REALTIME_MODEL,
            ...(language !== undefined ? { language } : {}),
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          `OpenAI realtime session request failed: ${response.status}`,
        );
      }
      const secret = extractClientSecret(await response.json());
      if (!secret) throw new Error("No client secret received");
      return secret;
    };

    try {
      if ((streams ?? 1) > 1) {
        const clientSecrets = await Promise.all(
          Array.from({ length: streams ?? 1 }, () => mint()),
        );
        return syncOk({ clientSecrets });
      }
      return syncOk({ clientSecret: await mint() });
    } catch (error) {
      return syncError(
        503,
        error instanceof Error ? error.message : "Provider request failed",
      );
    }
  });
}
