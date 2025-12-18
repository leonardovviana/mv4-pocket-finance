import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { ServiceKey } from "@/lib/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";

export type ServiceEntry = Tables<"service_entries">;

function monthRange(monthKey: string) {
  const start = startOfMonth(parseISO(`${monthKey}-01`));
  const end = startOfMonth(addMonths(start, 1));
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    startTs: start.toISOString(),
    endTs: end.toISOString(),
  };
}

export function useAllServiceEntries(userId?: string) {
  return useQuery({
    queryKey: ["service_entries", "all"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_entries")
        .select("*")
        .order("entry_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useServiceEntries(service: ServiceKey, userId?: string, monthKey?: string) {
  return useQuery({
    queryKey: ["service_entries", service, monthKey ?? "all"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const q = supabase
        .from("service_entries")
        .select("*")
        .eq("service", service)
        .order("entry_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      const { startDate, endDate, startTs, endTs } = monthKey
        ? monthRange(monthKey)
        : ({ startDate: null, endDate: null, startTs: null, endTs: null } as const);

      const { data, error } = monthKey
        ? await q.or(
            `and(entry_date.gte.${startDate},entry_date.lt.${endDate}),and(entry_date.is.null,created_at.gte.${startTs},created_at.lt.${endTs})`
          )
        : await q;

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertServiceEntry(service: ServiceKey, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      title: string;
      amount: number | null;
      entry_date: string | null;
      status: string | null;
      notes: string | null;
      metadata: Json;
    }) => {
      const basePayload = {
        title: payload.title,
        amount: payload.amount === null ? null : payload.amount.toFixed(2),
        entry_date: payload.entry_date,
        status: payload.status,
        notes: payload.notes,
        metadata: payload.metadata,
      };

      const { data, error } = payload.id
        ? await supabase
            .from("service_entries")
            .update(basePayload)
            .eq("id", payload.id)
            .select("*")
            .single()
        : await supabase
            .from("service_entries")
          .insert({ id: payload.id, user_id: userId, service, ...basePayload })
            .select("*")
            .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service_entries", service] });
      await queryClient.invalidateQueries({ queryKey: ["service_entries", "all"] });
    },
  });
}

export function useDeleteServiceEntry(service: ServiceKey, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service_entries", service] });
      await queryClient.invalidateQueries({ queryKey: ["service_entries", "all"] });
    },
  });
}
