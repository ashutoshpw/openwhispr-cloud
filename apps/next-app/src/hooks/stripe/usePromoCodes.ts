import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface PromoCode {
  id: string;
  code: string;
  coupon: {
    id: string;
    name: string | null;
    percent_off: number | null;
    amount_off: number | null;
  };
  active: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: number | null;
  restrictions: {
    first_time_transaction: boolean;
    minimum_amount: number | null;
  };
  metadata: Record<string, string>;
  created: number;
}

export interface CreatePromoCodeInput {
  code: string;
  coupon: string;
  active?: boolean;
  max_redemptions?: number;
  expires_at?: number;
  restrictions?: {
    first_time_transaction?: boolean;
    minimum_amount?: number;
  };
}

export interface UpdatePromoCodeInput {
  active?: boolean;
  metadata?: Record<string, string>;
  restrictions?: {
    first_time_transaction?: boolean;
    minimum_amount?: number;
  };
}

const QUERY_KEY = "promo-codes";

export function usePromoCodes(filters?: {
  active?: boolean;
  couponId?: string;
}) {
  return useQuery<PromoCode[]>({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.active !== undefined) {
        params.set("active", String(filters.active));
      }
      if (filters?.couponId) {
        params.set("coupon", filters.couponId);
      }

      const response = await fetch(`/api/admin/stripe/promo-codes?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch promo codes");
      }
      return response.json();
    },
  });
}

export function usePromoCode(promoCodeId?: string) {
  return useQuery<PromoCode>({
    queryKey: [QUERY_KEY, promoCodeId],
    queryFn: async () => {
      if (!promoCodeId) throw new Error("Promo code ID is required");

      const response = await fetch(
        `/api/admin/stripe/promo-codes/${promoCodeId}`,
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch promo code");
      }
      return response.json();
    },
    enabled: !!promoCodeId,
  });
}

export function useCreatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation<PromoCode, Error, CreatePromoCodeInput>({
    mutationFn: async (data) => {
      const response = await fetch("/api/admin/stripe/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create promo code");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Promo code created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create promo code");
    },
  });
}

export function useUpdatePromoCode(promoCodeId: string) {
  const queryClient = useQueryClient();

  return useMutation<PromoCode, Error, UpdatePromoCodeInput>({
    mutationFn: async (data) => {
      const response = await fetch(
        `/api/admin/stripe/promo-codes/${promoCodeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update promo code");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promoCodeId] });
      toast.success("Promo code updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update promo code");
    },
  });
}

export function useDeactivatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (promoCodeId) => {
      const response = await fetch(
        `/api/admin/stripe/promo-codes/${promoCodeId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to deactivate promo code");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Promo code deactivated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to deactivate promo code");
    },
  });
}
