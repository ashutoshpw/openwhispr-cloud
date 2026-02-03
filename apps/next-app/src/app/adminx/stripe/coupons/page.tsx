import { CouponTable } from "@/components/admin/stripe/CouponTable";
import { Button } from "@/components/ui/button";
import { getStripeCoupons } from "@/lib/stripe/queries";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function CouponsPage() {
  const coupons = await getStripeCoupons({ valid: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-muted-foreground">
            Manage discount coupons and promotion codes
          </p>
        </div>
        <Button asChild>
          <Link href="/adminx/stripe/coupons/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Coupon
          </Link>
        </Button>
      </div>
      <CouponTable coupons={coupons} />
    </div>
  );
}
