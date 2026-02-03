import { getPricingTiers } from "@/lib/stripe/queries";
import { PricingDisplay } from "./PricingDisplay";

export default async function Pricing() {
  const tiers = await getPricingTiers();

  return <PricingDisplay tiers={tiers} />;
}
