import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { ExpenseKind } from "@/lib/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";

export type Expense = Tables<"expenses">;

function monthRange(monthKey: string) {
  const start = startOfMonth(parseISO(`${monthKey}-01`));
  const end = startOfMonth(addMonths(start, 1));
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export function useExpenses(userId?: string, monthKey?: string) {
  return useQuery({
    queryKey: ["expenses", monthKey ?? "all"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const q = supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      const { startDate, endDate } = monthKey ? monthRange(monthKey) : { startDate: null, endDate: null };

      const { data, error } = monthKey
        ? await q.gte("expense_date", startDate as string).lt("expense_date", endDate as string)
        : await q;

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertExpense(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      kind: ExpenseKind;
      name: string;
      amount: number;
      expense_date: string;
      due_day: number | null;
      paid: boolean;
      cost_center: string | null;
      payment_method: string | null;
      installments: number | null;
      recurring: boolean;
      recurring_rule: string | null;
      receipt_url: string | null;
      notes: string | null;
      metadata: Json;
    }) => {
      const insertPayload = {
        id: payload.id,
        user_id: userId,
        kind: payload.kind,
        name: payload.name,
        amount: payload.amount.toFixed(2),
        expense_date: payload.expense_date,
        due_day: payload.due_day,
        paid: payload.paid,
        cost_center: payload.cost_center,
        payment_method: payload.payment_method,
        installments: payload.installments,
        recurring: payload.recurring,
        recurring_rule: payload.recurring_rule,
        receipt_url: payload.receipt_url,
        notes: payload.notes,
        metadata: payload.metadata,
      };

      const { data, error } = await supabase
        .from("expenses")
        .upsert(insertPayload)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
