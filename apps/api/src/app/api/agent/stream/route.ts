import { withSession } from "@/lib/session";
import { stream } from "@repo/ai";
import { z } from "zod";

/**
 * POST /api/agent/stream — NDJSON stream for cloud agent messages.
 *
 * Each line is one JSON object: {"type":"text","delta":"..."} per chunk and a
 * final {"type":"done"}. The desktop splits the body on newlines and forwards
 * each parsed line to the renderer (cloud-agent-stream-chunk).
 */

const contentPartSchema = z.object({ text: z.string().optional() });

const messageSchema = z.object({
  role: z.string(),
  content: z.union([
    z.string(),
    z.array(z.union([z.string(), contentPartSchema])),
  ]),
});

const payloadSchema = z.object({
  messages: z.array(messageSchema).min(1),
  systemPrompt: z.string().optional(),
  tools: z.unknown().optional(),
  screenContext: z.unknown().optional(),
  sessionId: z.string().optional(),
  clientType: z.string().optional(),
  appVersion: z.string().optional(),
});

type AgentMessage = z.infer<typeof messageSchema>;

function messageText(message: AgentMessage): string {
  if (typeof message.content === "string") return message.content;
  return message.content
    .map((part) => (typeof part === "string" ? part : (part.text ?? "")))
    .filter(Boolean)
    .join(" ");
}

function buildPrompt(messages: AgentMessage[]): string {
  return messages.map((m) => `${m.role}: ${messageText(m)}`).join("\n\n");
}

function inferenceConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.AI_DEFAULT_MODEL);
}

function ndjsonLine(value: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

export async function POST(request: Request) {
  return withSession(request, async () => {
    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        `${JSON.stringify({ type: "error", message: "Invalid agent stream payload" })}\n`,
        {
          status: 400,
          headers: {
            "content-type": "application/x-ndjson",
            "cache-control": "no-store",
          },
        },
      );
    }
    const input = parsed.data;

    if (!inferenceConfigured()) {
      return new Response(
        `${JSON.stringify({ type: "error", message: "Inference provider not configured" })}\n`,
        {
          headers: {
            "content-type": "application/x-ndjson",
            "cache-control": "no-store",
          },
        },
      );
    }

    const prompt = buildPrompt(input.messages);
    const system = input.systemPrompt?.trim() || undefined;

    const ndjsonBody = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const delta of stream(prompt, system)) {
            controller.enqueue(ndjsonLine({ type: "text", delta }));
          }
          controller.enqueue(ndjsonLine({ type: "done" }));
        } catch {
          controller.enqueue(
            ndjsonLine({ type: "error", message: "Inference request failed" }),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(ndjsonBody, {
      headers: {
        "content-type": "application/x-ndjson",
        "cache-control": "no-store",
      },
    });
  });
}
