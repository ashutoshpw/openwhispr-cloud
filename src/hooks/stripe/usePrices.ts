import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Price {
  id: string;
  product: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  recurring: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  } | null;
  type: "one_time" | "recurring";
  nickname: string | null;
  metadata: Record<string, string>;
  created: number;
}

export interface CreatePriceInput {
  product: string;
  unit_amount: number;
  currency: string;
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    interval_count?: number;
  };
  nickname?: string;
  active?: boolean;
  metadata?: Record<string, string>;
}

export interface UpdatePriceInput {
  active?: boolean;
  nickname?: string;
  metadata?: Record<string, string>;
}

const QUERY_KEY = "prices";

export function usePrices(filters?: { active?: boolean; productId?: string }) {
  return useQuery<Price[]>({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.active !== undefined) {
        params.set("active", String(filters.active));
      }
      if (filters?.productId) {
        params.set("product", filters.productId);
      }

      const response = await fetch(`/api/admin/stripe/prices?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch prices");
      }
      return response.json();
    },
  });
}

export function usePrice(priceId?: string) {
  return useQuery<Price>({
    queryKey: [QUERY_KEY, priceId],
    queryFn: async () => {
      if (!priceId) throw new Error("Price ID is required");
      
      const response = await fetch(`/api/admin/stripe/prices/${priceId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch price");
      }
      return response.json();
    },
    enabled: !!priceId,
  });
}

export function useCreatePrice() {
  const queryClient = useQueryClient();

  return useMutation<Price, Error, CreatePriceInput>({
    mutationFn: async (data) => {
      const response = await fetch("/api/admin/stripe/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create price");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["products", data.product] });
      toast.success("Price created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create price");
    },
  });
}

export function useUpdatePrice(priceId: string) {
  const queryClient = useQueryClient();

  return useMutation<Price, Error, UpdatePriceInput>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/admin/stripe/prices/${priceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update price");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, priceId] });
      if (typeof data.product === "string") {
        queryClient.invalidateQueries({ queryKey: ["products", data.product] });
      }
      toast.success("Price updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update price");
    },
  });
}
