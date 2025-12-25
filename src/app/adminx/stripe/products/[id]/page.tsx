import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getStripeProduct,
  getStripePricesForProduct,
} from "@/lib/stripe/queries";
import { Plus } from "lucide-react";
import { PriceList } from "@/components/admin/stripe/PriceList";
import type Stripe from "stripe";
import { ActionsMenu } from "@/components/admin/stripe/ActionsMenu";

function isStripeProduct(product: unknown): product is Stripe.Product {
  return (
    typeof product === "object" &&
    product !== null &&
    "id" in product &&
    typeof (product as { id?: unknown }).id === "string"
  );
}

function isStripePrice(price: unknown): price is Stripe.Price {
  return (
    typeof price === "object" &&
    price !== null &&
    "id" in price &&
    typeof (price as { id?: unknown }).id === "string"
  );
}

type PriceListItem = Parameters<typeof PriceList>[0]["prices"][number];

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productData = await getStripeProduct(id);
  const priceData = await getStripePricesForProduct(id);

  if (!isStripeProduct(productData)) {
    notFound();
  }

  const product = productData;
  const prices = priceData.filter(isStripePrice);
  const priceListItems: PriceListItem[] = prices.map((price) => ({
    id: price.id,
    active: Boolean(price.active),
    currency: price.currency,
    unit_amount: price.unit_amount ?? null,
    type: price.type,
    recurring: price.recurring
      ? {
          interval: price.recurring.interval,
          interval_count: price.recurring.interval_count ?? 1,
        }
      : null,
    nickname: price.nickname,
  }));

  const productImages = Array.isArray(product.images) ? product.images : [];
  const marketingFeatures =
    product.marketing_features
      ?.map((feature) => feature?.name)
      .filter((name): name is string => Boolean(name?.trim())) ?? [];
  const metadataEntries = Object.entries(product.metadata ?? {});
  const defaultPriceId =
    typeof product.default_price === "string"
      ? product.default_price
      : product.default_price?.id ?? null;

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Details</h1>
          <p className="text-muted-foreground">
            View and manage product information
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/adminx/stripe/products">Back to Products</Link>
          </Button>
          <Button asChild>
            <Link href={`/adminx/stripe/products/${product.id}/edit`}>
              Edit Product
            </Link>
          </Button>
          <ActionsMenu
            itemType="product"
            itemId={product.id}
            itemName={product.name}
            viewUrl={`/adminx/stripe/products/${product.id}`}
            editUrl={`/adminx/stripe/products/${product.id}/edit`}
            stripeUrl={`https://dashboard.stripe.com/products/${product.id}`}
            redirectAfterDelete="/adminx/stripe/products"
            isActive={product.active}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Product ID
              </label>
              <p className="font-mono text-sm">{product.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <p>{product.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <p className="text-sm">
                {product.description || "No description"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <div>
                <Badge
                  className={product.active ? "bg-emerald-500 text-white" : ""}
                  variant={product.active ? "default" : "secondary"}
                >
                  {product.active ? "Active" : "Archived"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created
              </label>
              <p className="text-sm">{formatDate(product.created)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Updated
              </label>
              <p className="text-sm">{formatDate(product.updated)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Statement descriptor
              </label>
              <p className="text-sm font-mono">
                {product.statement_descriptor || "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Unit label
              </label>
              <p className="text-sm">
                {product.unit_label ? product.unit_label : "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Default price
              </label>
              {product.default_price ? (
                <p className="text-sm font-mono">
                  {typeof product.default_price === "string"
                    ? product.default_price
                    : product.default_price.id}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            {productImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {productImages.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="rounded-md object-cover w-full h-32"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No images uploaded
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Marketing feature list</CardTitle>
          </CardHeader>
          <CardContent>
            {marketingFeatures.length ? (
              <ul className="space-y-2">
                {marketingFeatures.map((feature, index) => (
                  <li
                    key={`${feature}-${index}`}
                    className="flex items-start gap-2 rounded-md border p-3 text-sm"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No marketing features added.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            {metadataEntries.length ? (
              <div className="space-y-2">
                {metadataEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <span className="text-sm font-medium text-muted-foreground">
                      {key}
                    </span>
                    <span className="text-sm font-mono break-all">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No metadata added.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prices</CardTitle>
          <Button asChild size="sm">
            <Link href={`/adminx/stripe/products/${product.id}/prices/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Price
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <PriceList
            prices={priceListItems}
            productId={product.id}
            defaultPriceId={defaultPriceId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
