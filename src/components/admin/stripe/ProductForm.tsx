"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type Stripe from "stripe";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useCreateProduct,
  useUpdateProduct,
  type BillingInterval,
  type PriceType,
} from "@/hooks/stripe/useProducts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProductFormProps {
  product?: Stripe.Product;
  mode: "create" | "edit";
}

interface MetadataEntry {
  id: string;
  key: string;
  value: string;
  isReserved?: boolean;
}

const RESERVED_METADATA_KEYS = new Set([
  "created_by",
  "created_at",
  "updated_by",
  "updated_at",
]);

const currencyOptions = [
  { label: "USD - US Dollar", value: "usd" },
  { label: "EUR - Euro", value: "eur" },
  { label: "GBP - British Pound", value: "gbp" },
  { label: "CAD - Canadian Dollar", value: "cad" },
  { label: "AUD - Australian Dollar", value: "aud" },
];

const billingIntervals: { label: string; value: BillingInterval }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

const IMAGE_EXTENSION_REGEX = /\.(jpe?g|png|webp)(\?.*)?$/i;

function createEntryId() {
  return Math.random().toString(36).slice(2, 10);
}

function sanitizeMetadata(
  entries: MetadataEntry[]
): Record<string, string> | undefined {
  const result: Record<string, string> = {};

  entries.forEach(({ key, value, isReserved }) => {
    if (isReserved) return;
    if (!key.trim() || !value.trim()) return;
    result[key.trim()] = value.trim();
  });

  return Object.keys(result).length ? result : undefined;
}

export function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct(product?.id || "");

  const initialImage = product?.images?.[0] ?? "";
  const initialStatementDescriptor = product?.statement_descriptor ?? "";
  const initialUnitLabel = product?.unit_label ?? "";
  const initialMarketingFeatures = useMemo(() => {
    const features = product?.marketing_features ?? [];
    return features
      .map((feature) => feature.name?.trim())
      .filter((name): name is string => Boolean(name));
  }, [product?.marketing_features]);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [imageUrl, setImageUrl] = useState(initialImage);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImagePreviewReady, setIsImagePreviewReady] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [statementDescriptor, setStatementDescriptor] = useState(
    initialStatementDescriptor
  );
  const [unitLabel, setUnitLabel] = useState(initialUnitLabel);
  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>(() =>
    Object.entries(product?.metadata ?? {}).map(([key, value]) => ({
      id: createEntryId(),
      key,
      value: String(value),
      isReserved: RESERVED_METADATA_KEYS.has(key),
    }))
  );
  const [marketingFeatures, setMarketingFeatures] = useState<string[]>(
    initialMarketingFeatures
  );
  const [newFeature, setNewFeature] = useState("");
  const [enableInitialPrice, setEnableInitialPrice] = useState(false);
  const [priceType, setPriceType] = useState<PriceType>("recurring");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("usd");
  const [priceInterval, setPriceInterval] = useState<BillingInterval>("month");
  const [priceIntervalCount, setPriceIntervalCount] = useState("1");
  const [priceDescription, setPriceDescription] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);

  const isSubmitting =
    mode === "create"
      ? createProductMutation.isPending
      : updateProductMutation.isPending;

  const handleAddMetadata = () => {
    setMetadataEntries((prev) => [
      ...prev,
      { id: createEntryId(), key: "", value: "" },
    ]);
  };

  const handleMetadataChange = (
    id: string,
    field: "key" | "value",
    value: string
  ) => {
    setMetadataEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleRemoveMetadata = (id: string) => {
    setMetadataEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleAddFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed) {
      toast.error("Enter a feature description before adding.");
      return;
    }
    if (marketingFeatures.includes(trimmed)) {
      toast.error("That feature is already listed.");
      return;
    }
    if (marketingFeatures.length >= 8) {
      toast.error("You can add up to 8 features only.");
      return;
    }
    setMarketingFeatures((prev) => [...prev, trimmed]);
    setNewFeature("");
  };

  const handleRemoveFeature = (feature: string) => {
    setMarketingFeatures((prev) => prev.filter((item) => item !== feature));
  };

  const validateImageUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "Only HTTP or HTTPS URLs are supported.";
      }

      if (!IMAGE_EXTENSION_REGEX.test(parsed.pathname)) {
        return "Image must end with .jpg, .jpeg, .png, or .webp.";
      }
    } catch {
      return "Enter a valid image URL.";
    }

    return null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const trimmed = imageUrl.trim();
    if (!trimmed) {
      setImageError(null);
      setIsImagePreviewReady(false);
      setIsImageLoading(false);
      return;
    }

    const validationError = validateImageUrl(trimmed);
    if (validationError) {
      setImageError(validationError);
      setIsImagePreviewReady(false);
      setIsImageLoading(false);
      return;
    }

    setImageError(null);
    setIsImageLoading(true);
    setIsImagePreviewReady(false);

    let isCancelled = false;
    const img = new Image();
    img.onload = () => {
      if (isCancelled) return;
      setIsImagePreviewReady(true);
      setIsImageLoading(false);
    };
    img.onerror = () => {
      if (isCancelled) return;
      setImageError("Unable to load image from this URL.");
      setIsImagePreviewReady(false);
      setIsImageLoading(false);
    };
    img.src = trimmed;

    return () => {
      isCancelled = true;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!enableInitialPrice) {
      setPriceError(null);
      return;
    }

    if (!priceAmount.trim()) {
      setPriceError("Enter an amount for the initial price.");
      return;
    }

    const parsed = Number(priceAmount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setPriceError("Amount must be greater than 0.");
      return;
    }

    if (parsed > 999_999.99) {
      setPriceError(
        "Maximum supported amount is $999,999.99. Enter a smaller value."
      );
      return;
    }

    setPriceError(null);
  }, [priceAmount, enableInitialPrice]);

  const buildPayload = () => {
    const metadata = sanitizeMetadata(metadataEntries);
    const trimmedImage = imageUrl.trim();

    const descriptorChanged =
      statementDescriptor !== initialStatementDescriptor;
    const unitLabelChanged = unitLabel !== initialUnitLabel;
    const marketingFeaturesChanged =
      mode === "create"
        ? marketingFeatures.length > 0
        : JSON.stringify(marketingFeatures) !==
          JSON.stringify(initialMarketingFeatures);
    const imageChanged = mode === "create" || trimmedImage !== initialImage;

    const payload: any = {
      name,
      description: description || null,
      active,
    };

    if (imageChanged) {
      payload.images =
        trimmedImage && isImagePreviewReady && !imageError
          ? [trimmedImage]
          : [];
    }

    if (metadata) {
      payload.metadata = metadata;
    }

    if (descriptorChanged) {
      payload.statementDescriptor = statementDescriptor.trim()
        ? statementDescriptor.trim()
        : null;
    }

    if (unitLabelChanged) {
      payload.unitLabel = unitLabel.trim() ? unitLabel.trim() : null;
    }

    if (marketingFeaturesChanged) {
      payload.marketingFeatures = marketingFeatures;
    }

    if (mode === "create" && enableInitialPrice) {
      payload.initialPrice = {
        type: priceType,
        amount: Number(priceAmount),
        currency: priceCurrency,
        billingPeriod: priceType === "recurring" ? priceInterval : undefined,
        intervalCount:
          priceType === "recurring"
            ? Number(priceIntervalCount || "1")
            : undefined,
        description: priceDescription.trim()
          ? priceDescription.trim()
          : undefined,
      };
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl.trim() && (imageError || !isImagePreviewReady)) {
      toast.error(imageError || "Please provide a valid product image URL.");
      return;
    }
    if (isImageLoading) {
      toast.error("Please wait for the image preview to finish loading.");
      return;
    }
    if (enableInitialPrice && priceError) {
      toast.error(priceError);
      return;
    }
    const payload = buildPayload();

    try {
      const result =
        mode === "create"
          ? await createProductMutation.mutateAsync(payload)
          : await updateProductMutation.mutateAsync(payload);

      await new Promise((resolve) => setTimeout(resolve, 400));

      router.push(`/adminx/stripe/products/${result.id}`);
      router.refresh();
    } catch (error) {
      // errors are surfaced via the shared hooks/toasts
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Premium Plan"
              required
              maxLength={250}
            />
            <p className="text-xs text-muted-foreground">
              Appears at checkout.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              rows={4}
            />
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
              Active (product is available for purchase)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Product media</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://cdn.yourdomain.com/product.png"
                className={cn(
                  "flex-1",
                  imageError &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />
              <Button
                type="button"
                variant="ghost"
                className="w-28 shrink-0"
                onClick={() => setImageUrl("")}
                disabled={!imageUrl.trim()}
              >
                Remove
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG or WEBP. Appears at checkout.
            </p>
            {imageError && (
              <p className="text-xs text-destructive">{imageError}</p>
            )}
            {isImageLoading && (
              <p className="text-xs text-muted-foreground">Validating image…</p>
            )}
            {isImagePreviewReady && !imageError && (
              <div className="flex items-center gap-4 pt-2">
                <img
                  src={imageUrl}
                  alt={name || "Product media"}
                  className="h-20 w-20 rounded border object-cover"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Open the sections you need and add details for checkout, metadata,
            and pricing.
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-4">
            <AccordionItem value="descriptor">
              <AccordionTrigger>Statement descriptor</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <Label htmlFor="statementDescriptor">
                    Statement descriptor
                  </Label>
                  <Input
                    id="statementDescriptor"
                    value={statementDescriptor}
                    onChange={(e) => setStatementDescriptor(e.target.value)}
                    maxLength={22}
                    placeholder="YOUR BRAND*PLAN"
                  />
                  <p className="text-xs text-muted-foreground">
                    Overrides default descriptors. Only used for subscription
                    payments. Choose something your customers will recognise on
                    their bank statement.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="unitLabel">
              <AccordionTrigger>Unit label</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <Label htmlFor="unitLabel">Unit label</Label>
                  <Input
                    id="unitLabel"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    maxLength={12}
                    placeholder="seats"
                  />
                  <p className="text-xs text-muted-foreground">
                    Adding a unit label describes how you sell your product.
                    Unit labels appear in receipts, invoices, Checkout, and the
                    customer portal.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="metadata">
              <AccordionTrigger>Metadata</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Store additional, structured information. Add more key/value
                    pairs as needed.
                  </p>
                  <div className="space-y-2">
                    {metadataEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[1fr_1fr_auto] gap-2"
                      >
                        <Input
                          value={entry.key}
                          onChange={(e) =>
                            handleMetadataChange(
                              entry.id,
                              "key",
                              e.target.value
                            )
                          }
                          placeholder="Key"
                          disabled={entry.isReserved}
                        />
                        <Input
                          value={entry.value}
                          onChange={(e) =>
                            handleMetadataChange(
                              entry.id,
                              "value",
                              e.target.value
                            )
                          }
                          placeholder="Value"
                          disabled={entry.isReserved}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMetadata(entry.id)}
                          aria-label="Remove metadata row"
                          disabled={entry.isReserved}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddMetadata}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add metadata
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="features">
              <AccordionTrigger>Marketing feature list</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    A list of product features that will be visible to
                    customers. Displayed in pricing tables.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="e.g., Priority support"
                      maxLength={80}
                    />
                    <Button
                      type="button"
                      onClick={handleAddFeature}
                      disabled={
                        !newFeature.trim() || marketingFeatures.length >= 8
                      }
                    >
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {marketingFeatures.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                      >
                        <span>{feature}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFeature(feature)}
                          aria-label={`Remove ${feature}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {!marketingFeatures.length && (
                      <p className="text-xs text-muted-foreground">
                        No features added yet.
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {mode === "create" && (
              <AccordionItem value="pricing">
                <AccordionTrigger>Pricing (optional)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        id="enablePrice"
                        type="checkbox"
                        checked={enableInitialPrice}
                        onChange={(e) =>
                          setEnableInitialPrice(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="enablePrice">
                        Add an initial price for this product
                      </Label>
                    </div>

                    {enableInitialPrice && (
                      <div className="space-y-4 rounded border p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="priceAmount">Amount *</Label>
                            <Input
                              id="priceAmount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceAmount}
                              onChange={(e) => setPriceAmount(e.target.value)}
                              placeholder="9.99"
                              className={cn(
                                priceError &&
                                  "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            {priceError && (
                              <p className="text-xs text-destructive">
                                {priceError}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="priceCurrency">Currency *</Label>
                            <select
                              id="priceCurrency"
                              value={priceCurrency}
                              onChange={(e) => setPriceCurrency(e.target.value)}
                              className="h-10 w-full rounded border px-3"
                            >
                              {currencyOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Billing type *</Label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                value="one_time"
                                checked={priceType === "one_time"}
                                onChange={() => setPriceType("one_time")}
                                className="h-4 w-4"
                              />
                              One-off
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                value="recurring"
                                checked={priceType === "recurring"}
                                onChange={() => setPriceType("recurring")}
                                className="h-4 w-4"
                              />
                              Recurring
                            </label>
                          </div>
                        </div>

                        {priceType === "recurring" && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="priceInterval">
                                Billing period *
                              </Label>
                              <select
                                id="priceInterval"
                                value={priceInterval}
                                onChange={(e) =>
                                  setPriceInterval(
                                    e.target.value as BillingInterval
                                  )
                                }
                                className="h-10 w-full rounded border px-3"
                              >
                                {billingIntervals.map((interval) => (
                                  <option
                                    key={interval.value}
                                    value={interval.value}
                                  >
                                    {interval.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="priceIntervalCount">
                                Interval count *
                              </Label>
                              <Input
                                id="priceIntervalCount"
                                type="number"
                                min="1"
                                value={priceIntervalCount}
                                onChange={(e) =>
                                  setPriceIntervalCount(e.target.value)
                                }
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="priceDescription">
                            Price description
                          </Label>
                          <Input
                            id="priceDescription"
                            value={priceDescription}
                            onChange={(e) =>
                              setPriceDescription(e.target.value)
                            }
                            placeholder="e.g., Standard monthly price"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create Product" : "Update Product"}
        </Button>
      </div>
    </form>
  );
}
