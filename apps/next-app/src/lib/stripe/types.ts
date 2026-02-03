export interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  default_price: string | null;
  created: number;
  updated: number;
  images: string[] | null;
  metadata?: Record<string, string>;
  statement_descriptor?: string | null;
  unit_label?: string | null;
  features?: { name?: string }[];
}

export interface Price {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  type: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  nickname: string | null;
  product: string;
  created: number;
  metadata?: Record<string, string>;
}

export interface Coupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  duration_in_months: number | null;
  times_redeemed: number;
  max_redemptions: number | null;
  valid: boolean;
  redeem_by: number | null;
  created: number;
  metadata?: Record<string, string>;
}

export interface PromotionCode {
  id: string;
  code: string;
  coupon: string;
  active: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: number | null;
  created: number;
  metadata?: Record<string, string>;
  coupon_name?: string;
  percent_off?: number;
  amount_off?: number;
  coupon_currency?: string;
}
