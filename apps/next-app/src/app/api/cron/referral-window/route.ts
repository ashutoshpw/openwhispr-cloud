import { activateRipeRefundPeriodReferrals } from "@repo/billing";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const activated = await activateRipeRefundPeriodReferrals();
    console.log(`[cron/referral-window] activated ${activated} referral(s)`);
    return NextResponse.json({ activated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron/referral-window] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
