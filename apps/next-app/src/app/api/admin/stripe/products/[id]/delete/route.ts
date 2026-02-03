import { getSiteAdminStatus } from "@/lib/auth-utils";
import { stripe } from "@/lib/stripe/client";
import { auth } from "@repo/auth/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

async function listAllPrices(productId: string) {
  const prices: Stripe.Price[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const response = await stripe.prices.list({
      product: productId,
      limit: 100,
      starting_after: startingAfter,
    });

    prices.push(...response.data);

    if (!response.has_more) {
      break;
    }

    startingAfter = response.data[response.data.length - 1]?.id;
    if (!startingAfter) {
      break;
    }
  }

  return prices;
}

async function deletePrice(priceId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is not configured");
  }

  const response = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    if (response.status === 404) {
      return payload;
    }

    const error = payload?.error ?? {};
    const err = new Error(error.message || "Failed to delete price");
    (err as any).code = error.code;
    throw err;
  }

  return payload;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await getSiteAdminStatus(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    try {
      const prices = await listAllPrices(id);
      let hasUsedPrices = false;

      for (const price of prices) {
        try {
          await deletePrice(price.id);
        } catch (error: any) {
          if (
            error?.code === "price_in_use" ||
            error?.message?.includes("Price has been used")
          ) {
            hasUsedPrices = true;
            continue;
          }

          throw error;
        }
      }

      if (hasUsedPrices) {
        return NextResponse.json(
          {
            status: "in_use",
            reason:
              "Product has prices with active subscriptions and cannot be deleted.",
          },
          { status: 200 },
        );
      }

      await stripe.products.del(id);

      revalidatePath("/adminx/stripe/products");
      revalidatePath(`/adminx/stripe/products/${id}`);

      return NextResponse.json({ status: "deleted" });
    } catch (error: any) {
      if (error?.code === "product_in_use") {
        return NextResponse.json(
          {
            status: "in_use",
            reason:
              error?.message ||
              "Product cannot be deleted because it has been used in subscriptions or invoices.",
          },
          { status: 200 },
        );
      }

      throw error;
    }
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
