import { NextResponse } from "next/server";
import { db, sql } from "@repo/database";
import { organization } from "@repo/database/schema";
import { eq, and } from "@repo/database";
import {
  ORG_STATUS,
  AUDIT_ACTIONS,
  STRIPE_SCHEMA,
  logBillingEvent,
  updateOrganizationStatus,
} from "@/lib/billing";

// Vercel Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/trial-expiration
 * Cron job that runs daily to check for expired trials
 * Sets organizations with expired trials to read-only status
 *
 * This endpoint is secured by CRON_SECRET header
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting trial expiration check...");

    // Find organizations where:
    // 1. Status is 'active'
    // 2. Has a Stripe customer (meaning they had a subscription)
    // 3. Subscription has ended (trial_end in the past OR subscription ended)
    // We query the stripe schema to check subscription status

    // Get active organizations with Stripe customers
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

      // Check if subscription is expired by querying stripe schema
      const subscriptionCheck = await db().execute(
        sql`SELECT * FROM `
          .append(sql.raw(`${STRIPE_SCHEMA}.subscriptions`))
          .append(
            sql` WHERE customer = ${org.stripeCustomerId} AND status IN ('active', 'trialing', 'past_due') ORDER BY created DESC LIMIT 1`,
          ),
      );

      const subscription = subscriptionCheck[0] as
        | {
            id?: string;
            status?: string;
            trial_end?: number;
            current_period_end?: number;
          }
        | undefined;

      // If no active subscription found, organization should be readonly
      if (!subscription) {
        // Check if they had a subscription that ended
        const anySubscription = await db().execute(
          sql`SELECT * FROM `
            .append(sql.raw(`${STRIPE_SCHEMA}.subscriptions`))
            .append(
              sql` WHERE customer = ${org.stripeCustomerId} ORDER BY created DESC LIMIT 1`,
            ),
        );

        if (anySubscription.length > 0) {
          // They had a subscription that is now inactive
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
            `[Cron] Set workspace ${org.id} to readonly (subscription expired)`,
          );
        }
        continue;
      }

      // Check trial end
      if (subscription.status === "trialing" && subscription.trial_end) {
        const trialEndDate = new Date(subscription.trial_end * 1000);
        const now = new Date();

        if (trialEndDate < now) {
          // Trial has expired
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
            `[Cron] Set workspace ${org.id} to readonly (trial expired)`,
          );
        }
      }
    }

    console.log(
      `[Cron] Trial expiration check complete. ${expiredCount} workspaces set to readonly.`,
    );

    return NextResponse.json({
      success: true,
      checked: activeOrgs.length,
      expired: expiredCount,
    });
  } catch (error) {
    console.error("[Cron] Trial expiration check failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
