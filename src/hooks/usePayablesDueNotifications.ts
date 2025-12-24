import { useToast } from "@/hooks/use-toast";
import { usePayables } from "@/hooks/usePayables";
import { formatBRL, parseNumeric } from "@/lib/domain";
import { requestNotificationPermissionOnce, showNotificationSafely } from "@/lib/notifications";
import { useEffect, useMemo } from "react";

function dateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

export function usePayablesDueNotifications() {
  const { toast } = useToast();
  const payablesQuery = usePayables(undefined, true);

  const candidates = useMemo(() => {
    const items = payablesQuery.data ?? [];
    const today = new Date();
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrow0 = new Date(today0);
    tomorrow0.setDate(tomorrow0.getDate() + 1);

    return items.filter((p) => {
      if (p.status !== "open") return false;
      const due = parseDateOnly(p.due_date);
      return due <= tomorrow0;
    });
  }, [payablesQuery.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    requestNotificationPermissionOnce("mv4:pwa:payables-notifications-asked");
  }, []);

  useEffect(() => {
    if (!candidates.length) return;
    if (typeof window === "undefined") return;

    const today = dateKey(new Date());

    for (const p of candidates) {
      const key = `mv4:payables:notified:${today}:${p.id}`;
      if (localStorage.getItem(key) === "1") continue;

      localStorage.setItem(key, "1");

      const amount = parseNumeric(p.amount) ?? 0;
      const due = p.due_date;
      const title = `Conta a pagar: ${p.vendor}`;
      const body = [p.description ? p.description : null, formatBRL(amount), `Venc.: ${due}`]
        .filter(Boolean)
        .join(" • ");

      toast({
        title,
        description: body,
      });

      void showNotificationSafely({
        title,
        body,
        url: "/contas-a-pagar",
        tag: `payables:${p.id}`,
        requireInteraction: true,
      });
    }
  }, [candidates, toast]);
}

export function usePayablesDueNotificationsEnabled(enabled: boolean) {
  const { toast } = useToast();
  const payablesQuery = usePayables(undefined, enabled);

  const candidates = useMemo(() => {
    if (!enabled) return [];
    const items = payablesQuery.data ?? [];
    const today = new Date();
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrow0 = new Date(today0);
    tomorrow0.setDate(tomorrow0.getDate() + 1);

    return items.filter((p) => {
      if (p.status !== "open") return false;
      const due = parseDateOnly(p.due_date);
      return due <= tomorrow0;
    });
  }, [enabled, payablesQuery.data]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    requestNotificationPermissionOnce("mv4:pwa:payables-notifications-asked");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!candidates.length) return;
    if (typeof window === "undefined") return;

    const today = dateKey(new Date());

    for (const p of candidates) {
      const key = `mv4:payables:notified:${today}:${p.id}`;
      if (localStorage.getItem(key) === "1") continue;

      localStorage.setItem(key, "1");

      const amount = parseNumeric(p.amount) ?? 0;
      const due = p.due_date;
      const title = `Conta a pagar: ${p.vendor}`;
      const body = [p.description ? p.description : null, formatBRL(amount), `Venc.: ${due}`]
        .filter(Boolean)
        .join(" • ");

      toast({
        title,
        description: body,
      });

      void showNotificationSafely({
        title,
        body,
        url: "/contas-a-pagar",
        tag: `payables:${p.id}`,
        requireInteraction: true,
      });
    }
  }, [enabled, candidates, toast]);
}
