"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

interface PriceFormProps {
  productId: string;
  productName?: string;
}

const intervalPresets = [
  { label: "Daily", value: "day", interval: "day", count: 1 },
  { label: "Weekly", value: "week", interval: "week", count: 1 },
  { label: "Monthly", value: "month", interval: "month", count: 1 },
  { label: "Every 3 months", value: "quarterly", interval: "month", count: 3 },
  { label: "Every 6 months", value: "biannual", interval: "month", count: 6 },
  { label: "Yearly", value: "year", interval: "year", count: 1 },
  { label: "Custom", value: "custom", interval: "month", count: 1 },
];

const createTierId = () => Math.random().toString(36).slice(2, 10);

export function PriceForm({ productId, productName }: PriceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [priceName, setPriceName] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [billingType, setBillingType] = useState<"recurring" | "one_time">(
    "recurring"
  );

  const [pricingModel, setPricingModel] = useState<
    "flat" | "package" | "tiered" | "usage"
  >("flat");

  const [unitAmount, setUnitAmount] = useState("");
  const [packageUnitAmount, setPackageUnitAmount] = useState("");
  const [tiersMode, setTiersMode] = useState<"graduated" | "volume">("graduated");
  const [tiers, setTiers] = useState<
    { id: string; upTo: string; amount: string }[]
  >([{ id: createTierId(), upTo: "10", amount: "" }]);
  const [usageAggregation, setUsageAggregation] = useState<
    "sum" | "last_during_period" | "max" | "last_ever"
  >("sum");
  const [usageMeter, setUsageMeter] = useState("");

  const [intervalOption, setIntervalOption] = useState("month");
  const [customIntervalValue, setCustomIntervalValue] = useState("3");
  const [customIntervalUnit, setCustomIntervalUnit] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [priceDescription, setPriceDescription] = useState("");
  const [lookupKey, setLookupKey] = useState("");
  const [active, setActive] = useState(true);

  const [billingPeriodError, setBillingPeriodError] = useState<string | null>(
    null
  );

  const MAX_BILLING_DAYS = 365 * 3;
  const intervalToDays: Record<"day" | "week" | "month" | "year", number> = {
    day: 1,
    week: 7,
    month: 30,
    year: 365,
  };

  useEffect(() => {
    if (billingType !== "recurring") {
      setBillingPeriodError(null);
      return;
    }

    let count = 1;
    let unit: "day" | "week" | "month" | "year" = "month";
    if (intervalOption === "custom") {
      count = Number(customIntervalValue);
      unit = customIntervalUnit;
    } else {
      const preset = intervalPresets.find(
        (option) => option.value === intervalOption
      );
      if (preset) {
        count = preset.count;
        unit = preset.interval as "day" | "week" | "month" | "year";
      }
    }

    if (!Number.isFinite(count) || count < 1) {
      setBillingPeriodError("Billing period must be between 1 day and 3 years.");
      return;
    }

    const totalDays = count * intervalToDays[unit];
    if (totalDays < 1 || totalDays > MAX_BILLING_DAYS) {
      setBillingPeriodError("Billing period must be between 1 day and 3 years.");
      return;
    }

    setBillingPeriodError(null);
  }, [billingType, intervalOption, customIntervalValue, customIntervalUnit]);

  const handleTierChange = (
    tierId: string,
    field: "upTo" | "amount",
    value: string
  ) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId ? { ...tier, [field]: value } : tier
      )
    );
  };

  const handleAddTier = () => {
    setTiers((prev) => [
      ...prev,
      { id: createTierId(), upTo: "inf", amount: "" },
    ]);
  };

  const handleRemoveTier = (tierId: string) => {
    setTiers((prev) =>
      prev.length === 1 ? prev : prev.filter((tier) => tier.id !== tierId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!priceName.trim()) {
        throw new Error("Name is required.");
      }

      if (billingType === "recurring" && billingPeriodError) {
        throw new Error(billingPeriodError);
      }

      if (pricingModel === "usage" && billingType !== "recurring") {
        throw new Error("Usage-based pricing requires recurring billing.");
      }

      const payload: any = {
        product: productId,
        currency,
        nickname: priceDescription || undefined,
        lookup_key: lookupKey || undefined,
        active,
        name: priceName.trim(),
        pricing_model: pricingModel,
      };

      if (billingType === "recurring") {
        let interval = "month";
        let intervalCount = 1;
        if (intervalOption === "custom") {
          interval = customIntervalUnit;
          intervalCount = Number(customIntervalValue) || 1;
        } else {
          const preset = intervalPresets.find(
            (option) => option.value === intervalOption
          );
          if (preset) {
            interval = preset.interval;
            intervalCount = preset.count;
          }
        }

        payload.billing_type = "recurring";
        payload.interval = interval;
        payload.interval_count = intervalCount;
      } else {
        payload.billing_type = "one_time";
      }

      if (pricingModel === "flat") {
        const parsedAmount = parseFloat(unitAmount);
        const amountInCents = Math.round(parsedAmount * 100);
        if (!Number.isFinite(parsedAmount) || amountInCents <= 0) {
          throw new Error("Enter a valid price amount greater than 0.");
        }
        payload.unit_amount = amountInCents;
      } else if (pricingModel === "package") {
        const parsedAmount = parseFloat(packageUnitAmount);
        const amountInCents = Math.round(parsedAmount * 100);
        if (!Number.isFinite(parsedAmount) || amountInCents <= 0) {
          throw new Error("Enter a valid price per unit greater than 0.");
        }
        payload.unit_amount = amountInCents;
      } else if (pricingModel === "tiered") {
        payload.tiers_mode = tiersMode;
        const parsedTiers = tiers.map((tier, index) => {
          const amount = Math.round(parseFloat(tier.amount || "0") * 100);
          if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Enter valid tier amounts.");
          }
          const upTo =
            index === tiers.length - 1
              ? "inf"
              : Number(tier.upTo || "0") || "inf";
          return {
            up_to: upTo === "inf" ? "inf" : Math.max(1, Number(upTo)),
            unit_amount: amount,
          };
        });
        payload.tiers = parsedTiers;
      } else if (pricingModel === "usage") {
        const parsedAmount = parseFloat(unitAmount);
        const amountInCents = Math.round(parsedAmount * 100);
        if (!Number.isFinite(parsedAmount) || amountInCents <= 0) {
          throw new Error("Enter a valid price amount greater than 0.");
        }
        payload.unit_amount = amountInCents;
        payload.usage_type = "metered";
        payload.aggregate_usage = usageAggregation;
        payload.usage_meter = usageMeter || undefined;
      }

      const response = await fetch("/api/admin/stripe/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create price");
      }

      toast.success("Price created successfully!");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push(`/adminx/stripe/products/${productId}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create price");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Price Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {productName && (
            <div className="space-y-2">
              <Label>Product</Label>
              <div className="p-3 rounded border bg-muted/50">
                <p className="font-medium">{productName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {productId}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="priceName">Price name *</Label>
            <Input
              id="priceName"
              value={priceName}
              onChange={(e) => setPriceName(e.target.value)}
              placeholder="Pro plan monthly"
              required
            />
            <p className="text-xs text-muted-foreground">
              Internal label to help you identify this price in dashboards and
              integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded border p-2 h-10"
                required
              >
                <option value="usd">USD - US Dollar</option>
                <option value="eur">EUR - Euro</option>
                <option value="gbp">GBP - British Pound</option>
                <option value="cad">CAD - Canadian Dollar</option>
                <option value="aud">AUD - Australian Dollar</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricingModel">Pricing model *</Label>
              <select
                id="pricingModel"
                value={pricingModel}
                onChange={(e) =>
                  setPricingModel(e.target.value as typeof pricingModel)
                }
                className="w-full rounded border p-2 h-10"
              >
                <option value="flat">Flat rate</option>
                <option value="package">Package pricing</option>
                <option value="tiered">Tiered pricing</option>
                <option value="usage">Usage-based</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Determines how Stripe calculates charges for this price.
              </p>
            </div>
          </div>

          {pricingModel === "flat" && (
            <div className="space-y-2">
              <Label htmlFor="unitAmount">Amount *</Label>
              <Input
                id="unitAmount"
                type="number"
                min="0"
                step="0.01"
                value={unitAmount}
                onChange={(e) => setUnitAmount(e.target.value)}
                placeholder="9.99"
                required
              />
              <p className="text-xs text-muted-foreground">
                Charges a single flat fee per billing period.
              </p>
            </div>
          )}

          {pricingModel === "package" && (
            <div className="space-y-2">
              <Label htmlFor="packageUnitAmount">Price per unit *</Label>
              <Input
                id="packageUnitAmount"
                type="number"
                min="0"
                step="0.01"
                value={packageUnitAmount}
                onChange={(e) => setPackageUnitAmount(e.target.value)}
                placeholder="4.99"
                required
              />
              <p className="text-xs text-muted-foreground">
                Charge per seat, license, or package. Quantity is provided during
                checkout.
              </p>
            </div>
          )}

          {pricingModel === "usage" && (
            <div className="space-y-4 rounded border p-4">
              <div className="space-y-2">
                <Label htmlFor="usageAmount">Price per unit *</Label>
                <Input
                  id="usageAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitAmount}
                  onChange={(e) => setUnitAmount(e.target.value)}
                  placeholder="0.05"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Customers pay for the actual usage you report each cycle.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageAggregation">Aggregation method *</Label>
                <select
                  id="usageAggregation"
                  value={usageAggregation}
                  onChange={(e) =>
                    setUsageAggregation(
                      e.target.value as
                        | "sum"
                        | "last_during_period"
                        | "max"
                        | "last_ever"
                    )
                  }
                  className="w-full rounded border p-2 h-10"
                >
                  <option value="sum">Sum usage during period</option>
                  <option value="last_during_period">Last entry in period</option>
                  <option value="max">Maximum value during period</option>
                  <option value="last_ever">Last reported value</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageMeter">Meter name (optional)</Label>
                <Input
                  id="usageMeter"
                  value={usageMeter}
                  onChange={(e) => setUsageMeter(e.target.value)}
                  placeholder="API calls"
                />
              </div>
            </div>
          )}

          {pricingModel === "tiered" && (
            <div className="space-y-4 rounded border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tiersMode">Tier mode *</Label>
                  <select
                    id="tiersMode"
                    value={tiersMode}
                    onChange={(e) =>
                      setTiersMode(e.target.value as "graduated" | "volume")
                    }
                    className="w-full rounded border p-2 h-10"
                  >
                    <option value="graduated">Graduated (per tier pricing)</option>
                    <option value="volume">
                      Volume (same rate for all units)
                    </option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                {tiers.map((tier, index) => (
                  <div
                    key={tier.id}
                    className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <Input
                      value={tier.upTo}
                      onChange={(e) =>
                        handleTierChange(tier.id, "upTo", e.target.value)
                      }
                      placeholder={
                        index === tiers.length - 1 ? "inf" : "Units up to…"
                      }
                    />
                    <Input
                      value={tier.amount}
                      onChange={(e) =>
                        handleTierChange(tier.id, "amount", e.target.value)
                      }
                      placeholder="Price per unit"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTier(tier.id)}
                      disabled={tiers.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTier}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add tier
                </Button>
                <p className="text-xs text-muted-foreground">
                  Set the final tier&apos;s limit to &quot;inf&quot; to cover unlimited
                  usage.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Billing type *</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="one_time"
                  checked={billingType === "one_time"}
                  onChange={() => setBillingType("one_time")}
                  className="h-4 w-4"
                />
                One-off
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="recurring"
                  checked={billingType === "recurring"}
                  onChange={() => setBillingType("recurring")}
                  className="h-4 w-4"
                />
                Recurring
              </label>
            </div>
          </div>

          {billingType === "recurring" && (
            <div className="space-y-2">
              <Label htmlFor="billingInterval">Billing period *</Label>
              <select
                id="billingInterval"
                value={intervalOption}
                onChange={(e) => setIntervalOption(e.target.value)}
                className="w-full rounded border p-2 h-10"
              >
                {intervalPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              {intervalOption === "custom" && (
                <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                  <Input
                    type="number"
                    min="1"
                    value={customIntervalValue}
                    onChange={(e) => setCustomIntervalValue(e.target.value)}
                  />
                  <select
                    value={customIntervalUnit}
                    onChange={(e) =>
                      setCustomIntervalUnit(
                        e.target.value as "day" | "week" | "month" | "year"
                      )
                    }
                    className="rounded border p-2 h-10"
                  >
                    <option value="day">Days</option>
                    <option value="week">Weeks</option>
                    <option value="month">Months</option>
                    <option value="year">Years</option>
                  </select>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Billing period must be between 1 day and 3 years.
              </p>
              {billingPeriodError && (
                <p className="text-xs text-destructive">{billingPeriodError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="priceDescription">Price description</Label>
            <Input
              id="priceDescription"
              value={priceDescription}
              onChange={(e) => setPriceDescription(e.target.value)}
              placeholder="Shown on invoices, receipts, and Stripe dashboards"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lookupKey">Lookup key (optional)</Label>
            <Input
              id="lookupKey"
              value={lookupKey}
              onChange={(e) => setLookupKey(e.target.value)}
              placeholder="pro_monthly"
            />
            <p className="text-xs text-muted-foreground">
              Use a lookup key to upgrade customers between prices
              programmatically.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active (price is available for purchase)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Prices in Stripe are immutable. To change amount, currency, or billing,
            create a new price after saving.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Price
        </Button>
      </div>
    </form>
  );
}
