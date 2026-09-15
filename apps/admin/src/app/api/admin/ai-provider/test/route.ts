import { getOpenAIConfig } from "@/lib/ai-provider";
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const DEFAULT_BASE = "https://api.openai.com/v1";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await getSiteAdminStatus(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let config: Awaited<ReturnType<typeof getOpenAIConfig>>;
  try {
    config = await getOpenAIConfig();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Not configured",
      },
      { status: 400 },
    );
  }

  const base = (config.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, "");
  const url = `${base}/models`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          error: text.slice(0, 500) || res.statusText,
          url,
        },
        { status: 200 },
      );
    }
    let modelCount: number | null = null;
    try {
      const payload = JSON.parse(text) as { data?: unknown[] };
      if (Array.isArray(payload.data)) modelCount = payload.data.length;
    } catch {
      // Non-JSON OK response — still a successful reachability check.
    }
    return NextResponse.json({ ok: true, url, modelCount });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Request failed",
        url,
      },
      { status: 200 },
    );
  }
}
