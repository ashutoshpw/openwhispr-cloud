import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

export type StripeProduct = Stripe.Product;
export type StripePrice = Stripe.Price;
export type StripeCoupon = Stripe.Coupon;
export type StripePromotionCode = Stripe.PromotionCode;
export type StripeCustomer = Stripe.Customer;
export type StripePaymentIntent = Stripe.PaymentIntent;
