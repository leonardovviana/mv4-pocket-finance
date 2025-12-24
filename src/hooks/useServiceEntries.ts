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
      const base = supabase
        .from("service_entries")
        .select("*")
        .eq("service", service);

      if (!monthKey) {
        const { data, error } = await base
          .order("entry_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
      }

      const { startDate, endDate, startTs, endTs } = monthRange(monthKey);

      // Query 1: itens com entry_date preenchido
      const q1 = base
        .gte("entry_date", startDate)
        .lt("entry_date", endDate);

      // Query 2: itens sem entry_date (fallback para created_at)
      const q2 = base
        .is("entry_date", null)
        .gte("created_at", startTs)
        .lt("created_at", endTs);

      const [{ data: d1, error: e1 }, { data: d2, error: e2 }] = await Promise.all([q1, q2]);
      if (e1) throw e1;
      if (e2) throw e2;

      const merged = [...(d1 ?? []), ...(d2 ?? [])];
      const byId = new Map<string, ServiceEntry>();
      for (const row of merged) byId.set(row.id, row);

      const result = Array.from(byId.values());
      result.sort((a, b) => {
        const ad = a.entry_date ?? a.created_at;
        const bd = b.entry_date ?? b.created_at;
        return String(bd).localeCompare(String(ad));
      });

      return result;
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

      const { error } = payload.id
        ? await supabase
            .from("service_entries")
            .update(basePayload)
            .eq("id", payload.id)
        : await supabase
            .from("service_entries")
            .insert({ id: payload.id, user_id: userId, service, ...basePayload });

      if (error) throw error;
      return;
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
