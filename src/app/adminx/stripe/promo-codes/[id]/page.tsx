import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStripePromotionCode } from "@/lib/stripe/queries";
import { ExternalLink } from "lucide-react";
import { ActionsMenu } from "@/components/admin/stripe/ActionsMenu";

export default async function PromoCodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promoCode = await getStripePromotionCode(id);

  if (!promoCode) {
    notFound();
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "No expiration";
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatDiscount = () => {
    if (promoCode.coupon.percent_off) {
      return `${promoCode.coupon.percent_off}% off`;
    }
    if (promoCode.coupon.amount_off) {
      const amount = promoCode.coupon.amount_off / 100;
      return `${promoCode.coupon.currency?.toUpperCase()} ${amount} off`;
    }
    return "N/A";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Code Details</h1>
          <p className="text-muted-foreground">
            View promo code information and usage
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/adminx/stripe/promo-codes">Back to Promo Codes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={`https://dashboard.stripe.com/promotion_codes/${promoCode.id}`}
              target="_blank"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View in Stripe
            </Link>
          </Button>
          <ActionsMenu
            itemType="promo-code"
            itemId={promoCode.id}
            itemName={promoCode.code}
            stripeUrl={`https://dashboard.stripe.com/promotion_codes/${promoCode.id}`}
            redirectAfterDelete="/adminx/stripe/promo-codes"
            isActive={promoCode.active}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promo Code Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Code
            </label>
            <p className="text-2xl font-bold font-mono">{promoCode.code}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              ID
            </label>
            <p className="font-mono text-sm">{promoCode.id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Status
            </label>
            <div>
              <Badge variant={promoCode.active ? "default" : "secondary"}>
                {promoCode.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Discount
            </label>
            <p className="text-lg font-semibold">{formatDiscount()}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Linked Coupon
            </label>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm">{promoCode.coupon.id}</p>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/adminx/stripe/coupons/${promoCode.coupon.id}`}>
                  View Coupon
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage & Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Times Redeemed
            </label>
            <p className="text-lg font-semibold">
              {promoCode.times_redeemed || 0}
              {promoCode.max_redemptions &&
                ` / ${promoCode.max_redemptions}`}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Expiration
            </label>
            <p>{formatDate(promoCode.expires_at)}</p>
          </div>

          {promoCode.restrictions?.first_time_transaction && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Restrictions
              </label>
              <div>
                <Badge variant="outline">First-time customers only</Badge>
              </div>
            </div>
          )}

          {promoCode.restrictions?.minimum_amount && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Minimum Amount
              </label>
              <p>
                {promoCode.coupon.currency?.toUpperCase()}{" "}
                {promoCode.restrictions.minimum_amount / 100}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Created
            </label>
            <p>{new Date(promoCode.created * 1000).toLocaleString()}</p>
          </div>

          {promoCode.metadata?.created_by && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created By
              </label>
              <p>{promoCode.metadata.created_by}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
