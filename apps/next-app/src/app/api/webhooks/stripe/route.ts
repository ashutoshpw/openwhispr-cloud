import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { stripeSync } from "@/lib/stripe/sync";

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const payload = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (verifyError: any) {
      console.error("Webhook signature verification failed:", verifyError.message);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Event received: ${event.type} (ID: ${event.id})`);

    const skipSyncEvents = [
      "invoice.upcoming",
    ];

    if (skipSyncEvents.includes(event.type)) {
      return NextResponse.json({ received: true, skipped: true });
    }

    try {
      await stripeSync.processEvent(event);
      console.log(`[Webhook] Successfully synced event: ${event.type}`);
      
      revalidatePath("/adminx/stripe/products");
      revalidatePath("/adminx/stripe/prices");
      revalidatePath("/adminx/stripe/coupons");
      revalidatePath("/adminx/stripe/promo-codes");
      
    } catch (syncError: any) {
      if (syncError?.message?.includes("Unhandled webhook event")) {
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true, eventType: event.type });
      } else if (syncError?.code === "23502" && syncError?.column === "id") {
        console.log(`[Webhook] Skipped event due to missing ID: ${event.type}`);
        return NextResponse.json({ received: true, skipped: true, eventType: event.type });
      } else {
        console.error(`[Webhook] Failed to sync event: ${syncError?.message || "Unknown error"}`);
        return NextResponse.json(
          { error: `Failed to sync event: ${syncError?.message || "Unknown error"}` },
          { status: 500 }
        );
      }
    }
    console.log(`[Webhook] Completed processing: ${event.type}`);
    return NextResponse.json({ received: true, eventType: event.type });
  } catch (error: any) {
    console.error("[Webhook] Processing failed:", error?.message || "Unknown error");
    return NextResponse.json(
      { error: "Webhook processing failed", message: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}


export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is working" });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
