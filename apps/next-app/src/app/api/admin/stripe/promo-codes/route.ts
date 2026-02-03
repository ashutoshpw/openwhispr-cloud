import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await getSiteAdminStatus(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const promoCodeData: any = {
      code: body.code,
      coupon: body.coupon,
      active: body.active ?? true,
    };

    if (body.max_redemptions) {
      promoCodeData.max_redemptions = body.max_redemptions;
    }

    if (body.expires_at) {
      promoCodeData.expires_at = body.expires_at;
    }

    if (body.restrictions) {
      promoCodeData.restrictions = body.restrictions;
    }

    promoCodeData.metadata = {
      created_by: session.user.email || session.user.id,
      created_at: new Date().toISOString(),
    };

    const promotionCode = await stripe.promotionCodes.create(promoCodeData);

    revalidatePath("/adminx/stripe/promo-codes");
    return NextResponse.json(promotionCode);
  } catch (error: any) {
    console.error("Error creating promo code:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
