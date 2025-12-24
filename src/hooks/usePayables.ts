import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";

export type Payable = Tables<"accounts_payable">;

function monthRange(monthKey: string) {
  const start = startOfMonth(parseISO(`${monthKey}-01`));
  const end = startOfMonth(addMonths(start, 1));
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export function usePayables(monthKey?: string, enabled = true) {
  return useQuery({
    queryKey: ["payables", monthKey ?? "all"],
    enabled,
    queryFn: async () => {
      const q = supabase
        .from("accounts_payable")
        .select("*")
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: false });

      const { startDate, endDate } = monthKey ? monthRange(monthKey) : { startDate: null, endDate: null };

      const { data, error } = monthKey
        ? await q.gte("due_date", startDate as string).lt("due_date", endDate as string)
        : await q;

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      vendor: string;
      description: string | null;
      amount: number;
      due_date: string;
      status: "open" | "paid" | "canceled";
      payment_method: string | null;
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from("accounts_payable")
        .upsert({
          id: payload.id,
          vendor: payload.vendor,
          description: payload.description,
          amount: payload.amount,
          due_date: payload.due_date,
          status: payload.status,
          payment_method: payload.payment_method,
          notes: payload.notes,
        });

      if (error) throw error;
      return;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payables"] });
    },
  });
}

export function useDeletePayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts_payable").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payables"] });
    },
  });
}
