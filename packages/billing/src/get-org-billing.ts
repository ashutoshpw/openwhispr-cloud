import { db, eq } from "@repo/database";
import { orgBilling, planTier } from "@repo/database/schema";
import type { OrgBilling, PlanTier } from "@repo/database/schema";
import { nanoid } from "nanoid";

/**
 * Get billing state for an org. Auto-creates a default `free`/`active` row
 * if missing so callers can rely on a row always existing.
 */
export async function getOrgBilling(
  organizationId: string,
): Promise<OrgBilling> {
  const [existing] = await db()
    .select()
    .from(orgBilling)
    .where(eq(orgBilling.organizationId, organizationId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db()
    .insert(orgBilling)
    .values({
      id: nanoid(),
      organizationId,
      planTier: "free",
      planStatus: "active",
    })
    .returning();

  return created;
}

/** True if the org is on a paid, active/trialing plan. */
export function isPaidPlan(
  billing: Pick<OrgBilling, "planTier" | "planStatus">,
): boolean {
  if (billing.planTier === "free") return false;
  return billing.planStatus === "active" || billing.planStatus === "trialing";
}

/** Resolve the human-readable display name for a plan tier key. */
export async function getPlanTierDisplay(
  tierKey: string,
): Promise<PlanTier | null> {
  const [row] = await db()
    .select()
    .from(planTier)
    .where(eq(planTier.key, tierKey))
    .limit(1);
  return row ?? null;
}
