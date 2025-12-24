import { IOSCard, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import { useServiceEntries } from "@/hooks/useServiceEntries";
import { formatBRL, parseNumeric, SERVICE_LABEL, type ServiceKey } from "@/lib/domain";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText } from "lucide-react";
import { useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

function getPaymentInfo(entry: any) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const totalAbs = Math.abs(parseNumeric(entry.amount) ?? 0);
  const paidFlag = metadata.paid === true;
  const paidAmountMeta = parseNumeric(metadata.paid_amount) ?? 0;
  const paidAmountEffective =
    totalAbs > 0
      ? paidFlag
        ? totalAbs
        : Math.min(Math.max(paidAmountMeta, 0), totalAbs)
      : 0;
  const remaining = totalAbs > 0 ? Math.max(0, totalAbs - paidAmountEffective) : 0;
  const isPaid = totalAbs > 0 ? remaining <= 0 : paidFlag;
  const isPartial = !isPaid && paidAmountEffective > 0 && remaining > 0;
  return { isPaid, isPartial, remaining, paidAmount: paidAmountEffective, totalAbs, paidFlag };
}

function getMetaString(metadata: Record<string, unknown>, key: string) {
  const v = metadata[key];
  return typeof v === "string" ? v : "";
}

function groupLabelForService(service: ServiceKey, entry: any) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

  if (service === "gestao_midias") {
    const platform = getMetaString(metadata, "platform");
    return platform || "(sem plataforma)";
  }
  if (service === "carro_de_som") {
    const city = getMetaString(metadata, "city");
    return city || "(sem cidade)";
  }
  if (service === "revista_factus") {
    const edition = getMetaString(metadata, "edition");
    return edition ? `Edição ${edition}` : "(sem edição)";
  }
  if (service === "revista_saude") {
    const edition = getMetaString(metadata, "edition");
    return edition ? `Edição ${edition}` : "(sem edição)";
  }
  const client = getMetaString(metadata, "client");
  return client || "(sem cliente)";
}

function monthWindow(anchorMonthKey?: string) {
  const anchor = anchorMonthKey ? parseISO(`${anchorMonthKey}-01`) : new Date();
  const base = startOfMonth(anchor);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(base, i - 11));
  return months.map((d) => ({
    key: format(d, "yyyy-MM"),
    label: format(d, "MMM/yy", { locale: ptBR }),
    receitas: 0,
    despesas: 0,
  }));
}

function detectEntryType(entry: any) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const metaType = typeof metadata.entry_type === "string" ? metadata.entry_type : "";
  if (metaType === "despesa" || metaType === "receita") return metaType;
  const amount = parseNumeric(entry.amount) ?? 0;
  return amount < 0 ? "despesa" : "receita";
}

export function ServiceEntriesCharts(props: { service: ServiceKey }) {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const q = useServiceEntries(props.service, user?.id);

  const { totals, byMonth, openByGroup } = useMemo(() => {
    const items: any[] = q.data ?? [];

    const months = monthWindow(selectedMonth);
    const monthMap = new Map<string, (typeof months)[number]>();
    for (const m of months) monthMap.set(m.key, m);

    let totalReceitas = 0;
    let totalDespesas = 0;
    let openCount = 0;
    let openRemainingTotal = 0;
    const openMap = new Map<string, number>();

    for (const e of items) {
      const amountRaw = parseNumeric(e.amount) ?? 0;
      const amountAbs = Math.abs(amountRaw);
      const entryType = detectEntryType(e);
      if (entryType === "receita") totalReceitas += amountAbs;
      else totalDespesas += amountAbs;

      const dateStr = (e.entry_date ?? e.created_at) as string;
      try {
        const d = parseISO(dateStr);
        const key = format(d, "yyyy-MM");
        const bucket = monthMap.get(key);
        if (bucket) {
          if (entryType === "receita") bucket.receitas += amountAbs;
          else bucket.despesas += amountAbs;
        }
      } catch {
        // ignore
      }

      if (entryType === "receita") {
        const payment = getPaymentInfo(e);
        if (payment.remaining > 0) {
          openCount += 1;
          openRemainingTotal += payment.remaining;
          const label = groupLabelForService(props.service, e);
          openMap.set(label, (openMap.get(label) ?? 0) + payment.remaining);
        }
      }
    }

    const openByGroup = Array.from(openMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      totals: {
        receitas: totalReceitas,
        despesas: totalDespesas,
        count: items.length,
        openCount,
        openRemainingTotal,
      },
      byMonth: months,
      openByGroup,
    };
  }, [q.data, props.service, selectedMonth]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard title="Receitas" value={formatBRL(totals.receitas)} icon={FileText} iconColor="bg-ios-green" />
        <IOSStatCard title="Despesas" value={formatBRL(totals.despesas)} icon={FileText} iconColor="bg-ios-red" />
        <IOSStatCard title="A receber" value={formatBRL(totals.openRemainingTotal)} icon={FileText} iconColor="bg-ios-orange" />
        <IOSStatCard title="Pendências" value={String(totals.openCount)} icon={FileText} iconColor="bg-secondary" />
      </div>

      <IOSCard className="p-4">
        <IOSSectionHeader title="Receitas x Despesas (por mês)" className="px-0" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="receitas" fill="hsl(var(--ios-green))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(var(--ios-red))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </IOSCard>

      <IOSCard className="p-4">
        <IOSSectionHeader title="Quem falta pagar (top 6)" className="px-0" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={openByGroup} layout="vertical" margin={{ left: 40, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="value" fill="hsl(var(--ios-orange))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!q.isLoading && openByGroup.length === 0 ? (
          <div className="mt-2 text-sm text-muted-foreground">Nenhuma pendência de pagamento nos últimos meses.</div>
        ) : null}
      </IOSCard>

      {q.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : null}
    </div>
  );
}

export function ServiceEntriesReport(props: { service: ServiceKey }) {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const q = useServiceEntries(props.service, user?.id, selectedMonth);

  const rows = useMemo(() => {
    const items: any[] = q.data ?? [];

    return items
      .map((e) => {
        const payment = getPaymentInfo(e);
        const amount = Math.abs(parseNumeric(e.amount) ?? 0);
        const remaining = payment.remaining;
        const dateStr = e.entry_date ?? e.created_at;

        return {
          id: e.id,
          title: String(e.title ?? ""),
          amount,
          remaining,
          date: String(dateStr ?? ""),
          label: groupLabelForService(props.service, e),
        };
      })
      .filter((r) => r.remaining > 0)
      .sort((a, b) => (b.remaining || 0) - (a.remaining || 0))
      .slice(0, 20);
  }, [q.data, props.service]);

  return (
    <div className="space-y-3">
      <IOSCard className="p-4">
        <IOSSectionHeader title={"Quem falta pagar • " + (SERVICE_LABEL[props.service] ?? props.service)} className="px-0" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="text-right">Resta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      try {
                        return format(parseISO(r.date), "dd/MM/yy", { locale: ptBR });
                      } catch {
                        return r.date;
                      }
                    })()}
                  </div>
                </TableCell>
                <TableCell>{r.label}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(r.remaining)}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Nenhuma pendência no período.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </IOSCard>

      {q.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : null}
    </div>
  );
}
