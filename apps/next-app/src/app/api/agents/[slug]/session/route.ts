import { getOpenAIConfig } from "@/lib/ai-provider";
import { auth } from "@repo/auth/server";
import { agent, db, eq } from "@repo/database";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_BASE = "https://api.openai.com/v1";
const FALLBACK_MODEL = "gpt-4o-mini";

type IncomingMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const [row] = await db()
    .select()
    .from(agent)
    .where(eq(agent.slug, slug))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (row.status === "hidden" || row.status === "deprecated") {
    return NextResponse.json(
      { error: `Agent is ${row.status}` },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: IncomingMessage[];
    stream?: boolean;
    model?: string;
    temperature?: number;
  } | null;

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  const userMessages = body.messages
    .filter(
      (m): m is IncomingMessage =>
        !!m &&
        typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant" || m.role === "system"),
    )
    .filter((m) => m.role !== "system"); // system prompt comes from the agent

  if (userMessages.length === 0) {
    return NextResponse.json(
      { error: "at least one user/assistant message is required" },
      { status: 400 },
    );
  }

  let config: Awaited<ReturnType<typeof getOpenAIConfig>>;
  try {
    config = await getOpenAIConfig();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Provider not configured" },
      { status: 503 },
    );
  }

  const base = (config.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, "");
  const model =
    body.model?.trim() || row.model || config.defaultModel || FALLBACK_MODEL;
  const temperature =
    typeof body.temperature === "number"
      ? body.temperature
      : row.temperature !== null
        ? Number(row.temperature)
        : undefined;
  const stream = body.stream !== false;

  const messages: IncomingMessage[] = [];
  if (row.systemPrompt) {
    messages.push({ role: "system", content: row.systemPrompt });
  }
  messages.push(...userMessages);

  const upstream = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  });

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: "Upstream provider error",
        status: upstream.status,
        detail: errorText.slice(0, 1000),
      },
      { status: 502 },
    );
  }

  if (!stream) {
    const payload = await upstream.json();
    return NextResponse.json(payload);
  }

  // Pipe SSE stream straight through to the client.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
