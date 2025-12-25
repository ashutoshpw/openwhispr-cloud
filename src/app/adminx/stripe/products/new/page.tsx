import { ProductForm } from "@/components/admin/stripe/ProductForm";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Create Product</h1>
        <p className="text-muted-foreground">
          Add a new product to your Stripe account
        </p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
