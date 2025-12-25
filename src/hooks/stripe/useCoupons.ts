import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Coupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: "forever" | "once" | "repeating";
  duration_in_months: number | null;
  max_redemptions: number | null;
  redeem_by: number | null;
  times_redeemed: number;
  valid: boolean;
  metadata: Record<string, string>;
  created: number;
}

export interface CreateCouponInput {
  id?: string;
  name?: string;
  percent_off?: number;
  amount_off?: number;
  currency?: string;
  duration: "forever" | "once" | "repeating";
  duration_in_months?: number;
  max_redemptions?: number;
  redeem_by?: number;
  metadata?: Record<string, string>;
}

const QUERY_KEY = "coupons";

export function useCoupons(filters?: { valid?: boolean }) {
  return useQuery<Coupon[]>({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.valid !== undefined) {
        params.set("valid", String(filters.valid));
      }

      const response = await fetch(`/api/admin/stripe/coupons?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch coupons");
      }
      return response.json();
    },
  });
}

export function useCoupon(couponId?: string) {
  return useQuery<Coupon>({
    queryKey: [QUERY_KEY, couponId],
    queryFn: async () => {
      if (!couponId) throw new Error("Coupon ID is required");

      const response = await fetch(`/api/admin/stripe/coupons/${couponId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch coupon");
      }
      return response.json();
    },
    enabled: !!couponId,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation<Coupon, Error, CreateCouponInput>({
    mutationFn: async (data) => {
      const response = await fetch("/api/admin/stripe/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create coupon");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Coupon created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create coupon");
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (couponId) => {
      const response = await fetch(`/api/admin/stripe/coupons/${couponId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete coupon");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Coupon deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete coupon");
    },
  });
}
