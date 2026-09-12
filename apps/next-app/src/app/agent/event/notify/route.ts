import { recordAudit } from "@/lib/agent-auth/audit";
import { REVOKED_EVENT_SCHEMA } from "@/lib/agent-auth/discovery";
import {
  findTrustedProvider,
  getProviderKeyResolver,
} from "@/lib/agent-auth/providers";
import { getSiteUrl } from "@/lib/site-config";
import { db } from "@repo/database";
import {
  agentJtiSeen,
  agentRegistration,
  agentToken,
} from "@repo/database/schema-agent-auth";
import { and, eq, isNull } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const DEFAULT_TENANT_ID = "default";

function setError(err: string, description: string): NextResponse {
  return NextResponse.json({ err, description }, { status: 400 });
}

/**
 * POST /agent/event/notify — RFC 8935 push delivery of a Security Event Token
 * (RFC 8417). Currently handles the identity-assertion-revoked event: kills
 * the registration and every token derived from it. Unknown event schemas are
 * ignored (RFC 8417 §2.2). 202 Accepted on success, no body.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  if (!body) {
    return setError("invalid_request", "Missing SET body");
  }

  let header: { typ?: string };
  let payload: {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    jti?: string;
    events?: Record<string, unknown>;
  };
  try {
    const [h, p] = body.split(".");
    header = JSON.parse(Buffer.from(h, "base64url").toString());
    payload = JSON.parse(Buffer.from(p, "base64url").toString());
  } catch {
    return setError("invalid_request", "Malformed SET");
  }

  const issuer = payload.iss ?? "";
  const provider = issuer
    ? await findTrustedProvider(DEFAULT_TENANT_ID, issuer)
    : null;
  if (!provider) {
    return setError("invalid_issuer", "Issuer is not on the trust list");
  }

  if (payload.aud !== getSiteUrl()) {
    return setError("invalid_audience", "aud does not match this service");
  }

  if ((header.typ ?? "").toLowerCase() !== "secevent+jwt") {
    return setError("invalid_request", "Expected typ secevent+jwt");
  }

  try {
    const getKey = getProviderKeyResolver(provider);
    await jwtVerify(body, getKey, { issuer: provider.issuer });
  } catch {
    return setError(
      "authentication_failed",
      "SET signature verification failed",
    );
  }

  // Replay protection on the SET jti.
  if (payload.jti) {
    const inserted = await db()
      .insert(agentJtiSeen)
      .values({
        jti: `set:${payload.jti}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing()
      .returning({ jti: agentJtiSeen.jti });
    if (inserted.length === 0) {
      return setError("invalid_request", "Duplicate jti");
    }
  }

  const events = payload.events ?? {};
  if (REVOKED_EVENT_SCHEMA in events) {
    const registrations = await db()
      .select()
      .from(agentRegistration)
      .where(
        and(
          eq(agentRegistration.tenantId, DEFAULT_TENANT_ID),
          eq(agentRegistration.issuer, provider.issuer),
          eq(agentRegistration.subject, payload.sub ?? ""),
        ),
      );

    for (const registration of registrations) {
      if (registration.status === "revoked") continue;
      await db()
        .update(agentRegistration)
        .set({ status: "revoked" })
        .where(eq(agentRegistration.id, registration.id));
      await db()
        .update(agentToken)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(agentToken.registrationId, registration.id),
            isNull(agentToken.revokedAt),
          ),
        );
      await recordAudit({
        tenantId: registration.tenantId,
        event: "registration.revoked",
        registrationId: registration.id,
        issuer: provider.issuer,
        subject: payload.sub ?? null,
        metadata: { set_jti: payload.jti ?? null },
      });
    }
  }

  return new NextResponse(null, { status: 202 });
}
