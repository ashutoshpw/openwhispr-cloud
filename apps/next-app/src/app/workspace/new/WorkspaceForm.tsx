"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PricingTier } from "@/lib/stripe/queries";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface WorkspaceFormProps {
  pricingTiers: PricingTier[];
  canCreateFree: boolean;
  enterpriseContactLink: string;
}

export function WorkspaceForm({
  pricingTiers,
  canCreateFree,
  enterpriseContactLink,
}: WorkspaceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [error, setError] = useState<string | null>(null);

  // Check for cancelled checkout
  const checkoutCancelled = searchParams.get("checkout") === "cancelled";

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  };

  const selectedTier = pricingTiers.find((t) => t.id === selectedTierId);
  const selectedPrice =
    billingCycle === "yearly"
      ? selectedTier?.yearlyPrice
      : selectedTier?.monthlyPrice;
  const selectedPriceId =
    billingCycle === "yearly"
      ? selectedTier?.yearlyPriceId
      : selectedTier?.monthlyPriceId;

  const isFreeSelected = selectedTierId === "free";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }

    if (!slug.trim()) {
      setError("Workspace slug is required");
      return;
    }

    if (!selectedTierId) {
      setError("Please select a plan");
      return;
    }

    startTransition(async () => {
      try {
        if (isFreeSelected) {
          // Create free workspace directly
          const res = await fetch("/api/organizations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              slug: slug.trim(),
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.code === "FREE_WORKSPACE_LIMIT_REACHED") {
              setError(
                "You can only have one free workspace. Please upgrade an existing workspace or select a paid plan.",
              );
            } else {
              setError(data.error || "Failed to create workspace");
            }
            return;
          }

          toast.success("Workspace created!");
          router.push(`/dashboard/${data.organization.slug}`);
        } else {
          // Create paid workspace via checkout
          if (!selectedPriceId) {
            setError("Selected plan has no available price");
            return;
          }

          const res = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priceId: selectedPriceId,
              workspaceName: name.trim(),
              workspaceSlug: slug.trim(),
              withTrial: true,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || "Failed to create checkout session");
            return;
          }

          // Redirect to Stripe checkout
          window.location.href = data.checkoutUrl;
        }
      } catch (err) {
        console.error("Error creating workspace:", err);
        setError("An unexpected error occurred");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {checkoutCancelled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Checkout was cancelled. You can try again or select a different
            plan.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Workspace Details */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace Details</CardTitle>
            <CardDescription>
              Choose a name and URL for your new workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Workspace"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Workspace URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  {typeof window !== "undefined" ? window.location.host : ""}
                  /dashboard/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  placeholder="my-workspace"
                  className="max-w-[200px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Select a Plan</h2>
              <p className="text-muted-foreground text-sm">
                Start with a 14-day free trial on paid plans. No credit card
                required.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === "yearly"
                    ? "bg-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingCycle("yearly")}
              >
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Free Tier */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedTierId === "free"
                  ? "ring-2 ring-primary"
                  : "hover:border-primary/50"
              } ${!canCreateFree ? "opacity-60" : ""}`}
              onClick={() => canCreateFree && setSelectedTierId("free")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Free
                  {selectedTierId === "free" && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardTitle>
                <CardDescription>For personal projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  $0
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />1 team member
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />1 project
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Community support
                  </li>
                </ul>
                {!canCreateFree && (
                  <p className="mt-4 text-xs text-amber-600">
                    You already have a free workspace
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Paid Tiers */}
            {pricingTiers.map((tier) => {
              const price =
                billingCycle === "yearly"
                  ? tier.yearlyPrice
                  : tier.monthlyPrice;
              const priceId =
                billingCycle === "yearly"
                  ? tier.yearlyPriceId
                  : tier.monthlyPriceId;
              const isSelected = selectedTierId === tier.id;

              if (tier.isContactPricing) {
                return (
                  <Card
                    key={tier.id}
                    className="cursor-pointer transition-all hover:border-primary/50"
                    onClick={() => window.open(enterpriseContactLink, "_blank")}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {tier.name}
                        {tier.exclusive && (
                          <Badge variant="outline">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Enterprise
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">Custom</div>
                      <ul className="mt-4 space-y-2 text-sm">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        Contact Sales
                      </Button>
                    </CardFooter>
                  </Card>
                );
              }

              return (
                <Card
                  key={tier.id}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "ring-2 ring-primary"
                      : "hover:border-primary/50"
                  } ${tier.popular ? "border-primary" : ""}`}
                  onClick={() => priceId && setSelectedTierId(tier.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {tier.name}
                      {tier.popular && <Badge>Popular</Badge>}
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      ${price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {!priceId && (
                      <p className="mt-4 text-xs text-amber-600">
                        {billingCycle === "yearly" ? "Yearly" : "Monthly"}{" "}
                        pricing not available
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !selectedTierId || !name || !slug}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isFreeSelected
              ? "Create Free Workspace"
              : "Start 14-Day Free Trial"}
          </Button>
        </div>
      </form>
    </div>
  );
}
