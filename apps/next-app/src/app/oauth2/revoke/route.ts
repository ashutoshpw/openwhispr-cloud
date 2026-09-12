import { recordAudit } from "@/lib/agent-auth/audit";
import { getSigningKey } from "@/lib/agent-auth/keys";
import { db } from "@repo/database";
import { agentToken } from "@repo/database/schema-agent-auth";
import { and, eq, isNull } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

/**
 * POST /oauth2/revoke — RFC 7009 token revocation. Idempotent; 200 even for
 * unknown/already-revoked tokens (anti-enumeration). 400 only for a malformed
 * body.
 */
export async function POST(request: Request): Promise<Response> {
  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Body must be form-encoded",
      },
      { status: 400 },
    );
  }

  const token = form.get("token");
  if (!token) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "token parameter is required",
      },
      { status: 400 },
    );
  }

  try {
    const { privateKey } = await getSigningKey();
    const verified = await jwtVerify(token, privateKey);
    const jti = String(verified.payload.jti ?? "");
    if (jti) {
      await db()
        .update(agentToken)
        .set({ revokedAt: new Date() })
        .where(and(eq(agentToken.jti, jti), isNull(agentToken.revokedAt)));

      await recordAudit({
        tenantId: String(verified.payload.tid ?? "default"),
        event: "token.revoked",
        registrationId: String(verified.payload.sub ?? "") || null,
      });
    }
  } catch {
    // Unknown/invalid token: return 200 per RFC 7009 §2.2.
  }

  return new NextResponse(null, { status: 200 });
}
