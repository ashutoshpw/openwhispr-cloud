import { db, sql } from "@repo/database";
import { and, eq } from "@repo/database";
import { organization } from "@repo/database/schema";
import { logBillingEvent } from "../audit";
import { AUDIT_ACTIONS, ORG_STATUS, STRIPE_SCHEMA } from "../constants";
import { updateOrganizationStatus } from "../organization";

export interface TrialExpirationResult {
  checked: number;
  expired: number;
}

/**
 * Daily check for expired trials and ended subscriptions.
 * Sets affected organizations to read-only status.
 */
export async function runTrialExpirationCheck(): Promise<TrialExpirationResult> {
  console.log("[billing/trial-expiration] Starting trial expiration check...");

  const activeOrgs = await db()
    .select()
    .from(organization)
    .where(
      and(
        eq(organization.status, ORG_STATUS.ACTIVE),
        sql`${organization.stripeCustomerId} IS NOT NULL`,
      ),
    );

  let expiredCount = 0;

  for (const org of activeOrgs) {
    if (!org.stripeCustomerId) continue;

    const subscriptionCheck = await db().execute(
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.subscriptions`))
        .append(
          sql` WHERE customer = ${org.stripeCustomerId} AND status IN ('active', 'trialing', 'past_due') ORDER BY created DESC LIMIT 1`,
        ),
    );

    const subscription = subscriptionCheck.rows[0] as
      | {
          id?: string;
          status?: string;
          trial_end?: number;
          current_period_end?: number;
        }
      | undefined;

    if (!subscription) {
      const anySubscription = await db().execute(
        sql`SELECT * FROM `
          .append(sql.raw(`${STRIPE_SCHEMA}.subscriptions`))
          .append(
            sql` WHERE customer = ${org.stripeCustomerId} ORDER BY created DESC LIMIT 1`,
          ),
      );

      if (anySubscription.rows.length > 0) {
        await updateOrganizationStatus(org.id, ORG_STATUS.READONLY);
        await logBillingEvent({
          organizationId: org.id,
          action: AUDIT_ACTIONS.STATUS_CHANGED,
          fromValue: ORG_STATUS.ACTIVE,
          toValue: ORG_STATUS.READONLY,
          metadata: { reason: "subscription_expired", cronJob: true },
          performedBy: "system",
        });

        expiredCount++;
        console.log(
          `[billing/trial-expiration] Set workspace ${org.id} to readonly (subscription expired)`,
        );
      }
      continue;
    }

    if (subscription.status === "trialing" && subscription.trial_end) {
      const trialEndDate = new Date(subscription.trial_end * 1000);
      const now = new Date();

      if (trialEndDate < now) {
        await updateOrganizationStatus(org.id, ORG_STATUS.READONLY);
        await logBillingEvent({
          organizationId: org.id,
          action: AUDIT_ACTIONS.TRIAL_ENDED,
          metadata: {
            trialEndDate: trialEndDate.toISOString(),
            cronJob: true,
          },
          performedBy: "system",
        });
        await logBillingEvent({
          organizationId: org.id,
          action: AUDIT_ACTIONS.STATUS_CHANGED,
          fromValue: ORG_STATUS.ACTIVE,
          toValue: ORG_STATUS.READONLY,
          metadata: { reason: "trial_expired", cronJob: true },
          performedBy: "system",
        });

        expiredCount++;
        console.log(
          `[billing/trial-expiration] Set workspace ${org.id} to readonly (trial expired)`,
        );
      }
    }
  }

  console.log(
    `[billing/trial-expiration] Complete. ${expiredCount} workspaces set to readonly.`,
  );

  return { checked: activeOrgs.length, expired: expiredCount };
}
