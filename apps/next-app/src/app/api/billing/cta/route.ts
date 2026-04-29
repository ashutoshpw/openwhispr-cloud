import { auth } from "@repo/auth/server";
import {
  getOrgBilling,
  getPlanTierDisplay,
} from "@repo/billing/get-org-billing";
import { and, db, eq } from "@repo/database";
import { member, organization } from "@repo/database/schema";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ shouldShow: false });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ shouldShow: false });
  }

  const [org] = await db()
    .select()
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!org) return NextResponse.json({ shouldShow: false });

  const [membership] = await db()
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, org.id),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) return NextResponse.json({ shouldShow: false });

  try {
    const billing = await getOrgBilling(org.id);
    const tier = await getPlanTierDisplay(billing.planTier);
    const shouldShow = !tier?.isPaid;
    return NextResponse.json({
      shouldShow,
      href: `/dashboard/${slug}/~/settings/billing`,
    });
  } catch {
    // org_billing / plan_tier tables may not exist yet
    return NextResponse.json({ shouldShow: false });
  }
}
