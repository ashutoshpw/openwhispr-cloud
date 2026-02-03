import { ProductForm } from "@/components/admin/stripe/ProductForm";
import { getStripeProduct } from "@/lib/stripe/queries";
import { notFound } from "next/navigation";
import type Stripe from "stripe";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getStripeProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground">Update product information</p>
      </div>
      <ProductForm product={product as Stripe.Product} mode="edit" />
    </div>
  );
}
