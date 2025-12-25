import { getStripePromotionCodes } from "@/lib/stripe/queries";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PromoCodeTable } from "@/components/admin/stripe/PromoCodeTable";

export default async function PromoCodesPage() {
  const promoCodes = await getStripePromotionCodes({ limit: 100 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotion Codes</h1>
          <p className="text-muted-foreground">
            Create and manage customer-facing promo codes
          </p>
        </div>
        <Button asChild>
          <Link href="/adminx/stripe/promo-codes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Promo Code
          </Link>
        </Button>
      </div>

      <PromoCodeTable promoCodes={promoCodes as any} />
    </div>
  );
}
