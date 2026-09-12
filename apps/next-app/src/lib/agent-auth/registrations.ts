import "server-only";

import { randomBytes } from "node:crypto";
import { db } from "@repo/database";
import {
  type AgentRegistration,
  agentRegistration,
} from "@repo/database/schema-agent-auth";
import { and, eq, lt } from "drizzle-orm";
import { sha256Hex } from "./keys";

export const CLAIM_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // outer claim window
export const USER_CODE_TTL_MS = 10 * 60 * 1000; // user_code window
export const REGISTRATION_TTL_DAYS = Number(
  process.env.AGENT_AUTH_REGISTRATION_TTL_DAYS ?? 30,
);

export const PRE_CLAIM_SCOPES = "api.read";
export const POST_CLAIM_SCOPES = "api.read api.write";

export type RegistrationType =
  | "anonymous"
  | "service_auth"
  | "identity_assertion";

export function newRegistrationId(): string {
  return `reg_${randomBytes(12).toString("base64url")}`;
}

/** High-entropy claim_token; plaintext returned to the agent exactly once. */
export function newClaimToken(): {
  plaintext: string;
  hash: string;
  expiresAt: Date;
} {
  const plaintext = `clm_${randomBytes(25).toString("base64url")}`;
  return {
    plaintext,
    hash: sha256Hex(plaintext),
    expiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
  };
}

/** CSPRNG 6-digit user_code per RFC 8628 §6.1 guidance. */
export function newUserCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return String(n).padStart(6, "0");
}

/** Lazily flip unclaimed registrations past their TTL or claim window to expired. */
export async function expireStaleRegistrations(
  tenantId?: string,
): Promise<void> {
  const now = new Date();
  await db()
    .update(agentRegistration)
    .set({ status: "expired" })
    .where(
      and(
        eq(agentRegistration.status, "unclaimed"),
        lt(agentRegistration.registrationExpiresAt, now),
      ),
    );
  await db()
    .update(agentRegistration)
    .set({ status: "expired" })
    .where(
      and(
        eq(agentRegistration.status, "unclaimed"),
        lt(agentRegistration.claimExpiresAt, now),
      ),
    );
  void tenantId;
}

export async function getRegistration(
  id: string,
): Promise<AgentRegistration | null> {
  const [row] = await db()
    .select()
    .from(agentRegistration)
    .where(eq(agentRegistration.id, id))
    .limit(1);
  return row ?? null;
}

/** Resolve the scope set a token exchange should grant for this registration. */
export function resolveScopes(registration: AgentRegistration): string {
  if (
    registration.type === "anonymous" &&
    registration.status === "unclaimed"
  ) {
    return registration.preClaimScopes;
  }
  return registration.scopes;
}

export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
