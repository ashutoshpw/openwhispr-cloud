import {
  deleteOrgOpenAIConfig,
  getOpenAIConfig,
  getOrgOpenAIConfigMasked,
  upsertOrgOpenAIConfig,
} from "@/lib/ai-provider";
import {
  type AiProviderChangeFields,
  logOrgAiProviderChange,
} from "@/lib/ai-provider-audit";
import { auth } from "@repo/auth/server";
import { and, db, eq } from "@repo/database";
import { member } from "@repo/database/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  // The dynamic segment is named `slug` to match sibling routes under
  // /api/organizations/[slug]/*, but callers pass the organization id here.
  params: Promise<{ slug: string }>;
}

const DEFAULT_BASE = "https://api.openai.com/v1";

async function requireOrgWriter(organizationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  const [m] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!m) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }
  if (m.role !== "owner" && m.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Only owners and admins can change AI provider settings." },
        { status: 403 },
      ),
    } as const;
  }
  return { session } as const;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug: id } = await params;
  const guard = await requireOrgWriter(id);
  if ("error" in guard) return guard.error;
  const config = await getOrgOpenAIConfigMasked(id);
  return NextResponse.json(config);
}

export async function POST(request: Request, { params }: RouteParams) {
  const { slug: id } = await params;
  const guard = await requireOrgWriter(id);
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { baseUrl, apiKey, defaultModel, clearApiKey } = body as {
    baseUrl?: string | null;
    apiKey?: string;
    defaultModel?: string | null;
    clearApiKey?: boolean;
  };

  const trimmedBase = typeof baseUrl === "string" ? baseUrl.trim() : null;
  const trimmedModel =
    typeof defaultModel === "string" ? defaultModel.trim() : null;

  const nextApiKey = clearApiKey
    ? null
    : typeof apiKey === "string" && apiKey.trim()
      ? apiKey
      : undefined;

  await upsertOrgOpenAIConfig({
    organizationId: id,
    updatedBy: guard.session.user.id,
    baseUrl: baseUrl === undefined ? undefined : trimmedBase || null,
    defaultModel: defaultModel === undefined ? undefined : trimmedModel || null,
    apiKey: nextApiKey,
  });

  const changes: AiProviderChangeFields = {};
  if (baseUrl !== undefined) changes.baseUrl = trimmedBase ? "set" : "cleared";
  if (defaultModel !== undefined)
    changes.defaultModel = trimmedModel ? "set" : "cleared";
  if (nextApiKey === null) changes.apiKey = "cleared";
  else if (typeof nextApiKey === "string") changes.apiKey = "set";
  await logOrgAiProviderChange(id, guard.session.user.id, changes);

  const config = await getOrgOpenAIConfigMasked(id);
  return NextResponse.json(config);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { slug: id } = await params;
  const guard = await requireOrgWriter(id);
  if ("error" in guard) return guard.error;
  await deleteOrgOpenAIConfig(id);
  await logOrgAiProviderChange(id, guard.session.user.id, {
    action: "ai_provider_reset",
    apiKey: "cleared",
    baseUrl: "cleared",
    defaultModel: "cleared",
  });
  return NextResponse.json({ success: true });
}

export async function PUT(_request: Request, { params }: RouteParams) {
  // Test the effective org config by hitting /v1/models.
  const { slug: id } = await params;
  const guard = await requireOrgWriter(id);
  if ("error" in guard) return guard.error;

  let config: Awaited<ReturnType<typeof getOpenAIConfig>>;
  try {
    config = await getOpenAIConfig(id);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Not configured",
      },
      { status: 200 },
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
      return NextResponse.json({
        ok: false,
        url,
        status: res.status,
        error: text.slice(0, 500) || res.statusText,
        source: config.source,
      });
    }
    let modelCount: number | null = null;
    try {
      const payload = JSON.parse(text) as { data?: unknown[] };
      if (Array.isArray(payload.data)) modelCount = payload.data.length;
    } catch {
      /* ignore */
    }
    return NextResponse.json({
      ok: true,
      url,
      modelCount,
      source: config.source,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      url,
      error: err instanceof Error ? err.message : "Request failed",
    });
  }
}
