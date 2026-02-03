import { db } from "@repo/database";
import { sql } from "@repo/database";
import { stripe } from "./client";

const STRIPE_SCHEMA = process.env.STRIPE_SCHEMA ?? "stripe";

async function tableExists(
  tableName: string,
  schema: string = STRIPE_SCHEMA,
): Promise<boolean> {
  try {
    const result = await db().execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = ${schema} AND table_name = ${tableName}
      )`,
    );
    return (result[0]?.exists as boolean) || false;
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
    console.warn(
      "stripe.products table does not exist. Fetching from Stripe API...",
    );
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

  let query = sql`SELECT * FROM `
    .append(sql.raw(`${STRIPE_SCHEMA}.products`))
    .append(sql` WHERE 1=1`);

  if (filters?.active !== undefined) {
    query = sql`${query} AND active = ${filters.active}`;
  }

  if (filters?.search) {
    query = sql`${query} AND (name ILIKE ${`%${filters.search}%`} OR description ILIKE ${`%${filters.search}%`})`;
  }

  query = sql`${query} ORDER BY created ASC`;

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
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.products`))
        .append(sql` WHERE id = ${productId} LIMIT 1`),
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

  let query = sql`SELECT * FROM `
    .append(sql.raw(`${STRIPE_SCHEMA}.prices`))
    .append(sql` WHERE 1=1`);

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
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.prices`))
        .append(sql` WHERE product = ${productId} ORDER BY created DESC`),
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
      sql`SELECT * FROM `
        .append(sql.raw(`${STRIPE_SCHEMA}.prices`))
        .append(sql` WHERE id = ${priceId} LIMIT 1`),
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

// Types for pricing display
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  features: string[];
  popular: boolean;
  exclusive: boolean;
  displayOrder: number;
  isContactPricing: boolean;
  actionLabel: string;
}

// Default fallback pricing tiers when Stripe is not configured
const DEFAULT_PRICING_TIERS: PricingTier[] = [
  {
    id: "default-basic",
    name: "Basic",
    description: "Essential features you need to get started",
    monthlyPrice: 10,
    yearlyPrice: 100,
    monthlyPriceId: null,
    yearlyPriceId: null,
    features: [
      "Example Feature Number 1",
      "Example Feature Number 2",
      "Example Feature Number 3",
    ],
    popular: false,
    exclusive: false,
    displayOrder: 1,
    isContactPricing: false,
    actionLabel: "Get Started",
  },
  {
    id: "default-pro",
    name: "Pro",
    description: "Perfect for owners of small & medium businesses",
    monthlyPrice: 25,
    yearlyPrice: 250,
    monthlyPriceId: null,
    yearlyPriceId: null,
    features: [
      "Example Feature Number 1",
      "Example Feature Number 2",
      "Example Feature Number 3",
    ],
    popular: true,
    exclusive: false,
    displayOrder: 2,
    isContactPricing: false,
    actionLabel: "Get Started",
  },
  {
    id: "default-enterprise",
    name: "Enterprise",
    description: "Dedicated support and infrastructure to fit your needs",
    monthlyPrice: null,
    yearlyPrice: null,
    monthlyPriceId: null,
    yearlyPriceId: null,
    features: [
      "Example Feature Number 1",
      "Example Feature Number 2",
      "Example Feature Number 3",
      "Super Exclusive Feature",
    ],
    popular: false,
    exclusive: true,
    displayOrder: 3,
    isContactPricing: true,
    actionLabel: "Contact Sales",
  },
];

/**
 * Fetch pricing tiers for homepage display.
 * Returns products with their monthly/yearly prices, features, and display metadata.
 * Falls back to default tiers if Stripe is not configured.
 */
export async function getPricingTiers(): Promise<PricingTier[]> {
  try {
    // Fetch active products
    const products = await getStripeProducts({ active: true });

    if (!products || products.length === 0) {
      console.warn("No active products found. Using default pricing tiers.");
      return DEFAULT_PRICING_TIERS;
    }

    const pricingTiers: PricingTier[] = [];

    for (const product of products) {
      // Type the product properly
      const productData = product as {
        id: string;
        name?: string;
        description?: string;
        metadata?: Record<string, string>;
      };

      const metadata: Record<string, string> = productData.metadata || {};

      // Skip products not meant for public display
      if (metadata.hide_from_pricing === "true") {
        continue;
      }

      // Fetch prices for this product
      const prices = await getStripePricesForProduct(productData.id);
      const activePrices = Array.isArray(prices)
        ? prices.filter((p: { active?: boolean }) => p.active !== false)
        : [];

      // Find monthly and yearly prices
      let monthlyPrice: number | null = null;
      let yearlyPrice: number | null = null;
      let monthlyPriceId: string | null = null;
      let yearlyPriceId: string | null = null;

      for (const price of activePrices) {
        const priceData = price as {
          id: string;
          unit_amount?: number | null;
          recurring?: { interval?: string } | null;
          metadata?: Record<string, string>;
        };

        const interval = priceData.recurring?.interval;
        const amount = priceData.unit_amount;

        if (interval === "month" && amount != null) {
          monthlyPrice = amount / 100;
          monthlyPriceId = priceData.id;
        } else if (interval === "year" && amount != null) {
          yearlyPrice = amount / 100;
          yearlyPriceId = priceData.id;
        }
      }

      // Parse features from metadata (comma-separated or JSON array)
      let features: string[] = [];
      if (metadata.features) {
        try {
          features = JSON.parse(metadata.features);
        } catch {
          features = metadata.features.split(",").map((f: string) => f.trim());
        }
      }

      // Determine if this is a contact-based pricing tier
      const isContactPricing =
        metadata.pricing_type === "contact" ||
        (monthlyPrice === null && yearlyPrice === null);

      const tier: PricingTier = {
        id: productData.id,
        name: productData.name || "Unnamed Plan",
        description: productData.description || "",
        monthlyPrice,
        yearlyPrice,
        monthlyPriceId,
        yearlyPriceId,
        features,
        popular: metadata.popular === "true",
        exclusive: metadata.exclusive === "true" || isContactPricing,
        displayOrder: metadata.display_order
          ? Number.parseInt(metadata.display_order, 10)
          : 99,
        isContactPricing,
        actionLabel: isContactPricing
          ? metadata.action_label || "Contact Sales"
          : metadata.action_label || "Get Started",
      };

      pricingTiers.push(tier);
    }

    if (pricingTiers.length === 0) {
      console.warn("No displayable pricing tiers found. Using defaults.");
      return DEFAULT_PRICING_TIERS;
    }

    // Sort by display order
    pricingTiers.sort((a, b) => a.displayOrder - b.displayOrder);

    return pricingTiers;
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return DEFAULT_PRICING_TIERS;
  }
}
