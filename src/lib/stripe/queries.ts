import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { stripe } from "./client";

const STRIPE_SCHEMA = process.env.STRIPE_SCHEMA ?? "stripe";

async function tableExists(tableName: string, schema: string = STRIPE_SCHEMA): Promise<boolean> {
  try {
    const result = await db().execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = ${schema} AND table_name = ${tableName}
      )`
    );
    return result[0]?.exists as boolean || false;
  } catch (error) {
    return false;
  }
}

export async function getStripeProducts(filters?: {
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const hasTable = await tableExists("products");

  if (!hasTable) {
    console.warn("stripe.products table does not exist. Fetching from Stripe API...");
    try {
      const products = await stripe.products.list({
        active: filters?.active,
        limit: filters?.limit || 100,
      });
      return products.data;
    } catch (error) {
      console.error("Error fetching from Stripe API:", error);
      return [];
    }
  }

  let query = sql`SELECT * FROM `.append(sql.raw(`${STRIPE_SCHEMA}.products`)).append(sql` WHERE 1=1`);

  if (filters?.active !== undefined) {
    query = sql`${query} AND active = ${filters.active}`;
  }

  if (filters?.search) {
    query = sql`${query} AND (name ILIKE ${"%" + filters.search + "%"} OR description ILIKE ${"%" + filters.search + "%"})`;
  }

  query = sql`${query} ORDER BY created DESC`;

  if (filters?.limit) {
    query = sql`${query} LIMIT ${filters.limit}`;
  }

  if (filters?.offset) {
    query = sql`${query} OFFSET ${filters.offset}`;
  }

  try {
    const result = await db().execute(query);
    return result;
  } catch (error) {
    console.error("Error querying stripe.products:", error);
    const products = await stripe.products.list({
      active: filters?.active,
      limit: filters?.limit || 100,
    });
    return products.data;
  }
}

export async function getStripeProduct(productId: string) {
  const hasTable = await tableExists("products");

  if (!hasTable) {
    try {
      const product = await stripe.products.retrieve(productId);
      return product;
    } catch (error) {
      console.error("Error fetching product from Stripe:", error);
      return null;
    }
  }

  try {
    const result = await db().execute(
      sql`SELECT * FROM `.append(sql.raw(`${STRIPE_SCHEMA}.products`)).append(sql` WHERE id = ${productId} LIMIT 1`)
    );
    return result[0] || null;
  } catch (error) {
    console.error("Error querying stripe.products:", error);
    try {
      const product = await stripe.products.retrieve(productId);
      return product;
    } catch (stripeError) {
      return null;
    }
  }
}

export async function getStripePrices(filters?: {
  active?: boolean;
  productId?: string;
  type?: string;
  limit?: number;
}) {
  const hasTable = await tableExists("prices");

  if (!hasTable) {
    try {
      const prices = await stripe.prices.list({
        active: filters?.active,
        product: filters?.productId,
        limit: filters?.limit || 100,
      });
      return prices.data;
    } catch (error) {
      console.error("Error fetching from Stripe API:", error);
      return [];
    }
  }

  let query = sql`SELECT * FROM `.append(sql.raw(`${STRIPE_SCHEMA}.prices`)).append(sql` WHERE 1=1`);

  if (filters?.active !== undefined) {
    query = sql`${query} AND active = ${filters.active}`;
  }

  if (filters?.productId) {
    query = sql`${query} AND product = ${filters.productId}`;
  }

  if (filters?.type) {
    query = sql`${query} AND type = ${filters.type}`;
  }

  query = sql`${query} ORDER BY created DESC`;

  if (filters?.limit) {
    query = sql`${query} LIMIT ${filters.limit}`;
  }

  try {
    const result = await db().execute(query);
    return result;
  } catch (error) {
    console.error("Error querying stripe.prices:", error);
    const prices = await stripe.prices.list({
      active: filters?.active,
      product: filters?.productId,
      limit: filters?.limit || 100,
    });
    return prices.data;
  }
}

export async function getStripePricesForProduct(productId: string) {
  const hasTable = await tableExists("prices");

  if (!hasTable) {
    try {
      const prices = await stripe.prices.list({
        product: productId,
        limit: 100,
      });
      return prices.data;
    } catch (error) {
      console.error("Error fetching from Stripe API:", error);
      return [];
    }
  }

  try {
    const result = await db().execute(
      sql`SELECT * FROM `.append(sql.raw(`${STRIPE_SCHEMA}.prices`)).append(sql` WHERE product = ${productId} ORDER BY created DESC`)
    );
    return result;
  } catch (error) {
    console.error("Error querying stripe.prices:", error);
    const prices = await stripe.prices.list({
      product: productId,
      limit: 100,
    });
    return prices.data;
  }
}

export async function getStripePrice(priceId: string) {
  const hasTable = await tableExists("prices");

  if (!hasTable) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      return price;
    } catch (error) {
      return null;
    }
  }

  try {
    const result = await db().execute(
      sql`SELECT * FROM `.append(sql.raw(`${STRIPE_SCHEMA}.prices`)).append(sql` WHERE id = ${priceId} LIMIT 1`)
    );
    return result[0] || null;
  } catch (error) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      return price;
    } catch (stripeError) {
      return null;
    }
  }
}

export async function getStripeCoupons(filters?: {
  valid?: boolean;
  search?: string;
  limit?: number;
}) {
  try {
    const coupons = await stripe.coupons.list({
      limit: filters?.limit || 100,
    });
    return coupons.data;
  } catch (error) {
    console.error("Error fetching from Stripe API:", error);
    return [];
  }
}

export async function getStripeCoupon(couponId: string) {
  try {
    const coupon = await stripe.coupons.retrieve(couponId);
    return coupon;
  } catch (error) {
    return null;
  }
}

export async function getStripePromotionCodes(filters?: {
  active?: boolean;
  couponId?: string;
  limit?: number;
}) {
  try {
    const promoCodes = await stripe.promotionCodes.list({
      active: filters?.active,
      coupon: filters?.couponId,
      limit: filters?.limit || 100,
    });
    return promoCodes.data;
  } catch (error) {
    console.error("Error fetching from Stripe API:", error);
    return [];
  }
}

export async function getStripePromotionCode(promoCodeId: string) {
  try {
    const promoCode = await stripe.promotionCodes.retrieve(promoCodeId);
    return promoCode;
  } catch (error) {
    return null;
  }
}
