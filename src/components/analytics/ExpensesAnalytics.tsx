import { IOSCard, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/hooks/useExpenses";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import { useAllServiceEntries } from "@/hooks/useServiceEntries";
import { formatBRL, parseNumeric, type ExpenseKind } from "@/lib/domain";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, Wallet } from "lucide-react";
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

function kindLabel(kind: ExpenseKind) {
  if (kind === "fixed") return "Fixa";
  if (kind === "variable") return "Variável";
  return "Provisão";
}

function getExpensePaymentInfo(expense: any) {
  const metadata = (expense.metadata ?? {}) as Record<string, unknown>;
  const total = parseNumeric(expense.amount) ?? 0;
  const paidAmountMeta = parseNumeric(metadata.paid_amount) ?? 0;
  const paidAmountEffective =
    total > 0
      ? expense.paid
        ? total
        : Math.min(Math.max(paidAmountMeta, 0), total)
      : 0;
  const remaining = total > 0 ? Math.max(0, total - paidAmountEffective) : 0;
  const isPaid = total > 0 ? remaining <= 0 : expense.paid;
  const isPartial = !isPaid && paidAmountEffective > 0 && remaining > 0;
  return { isPaid, isPartial, remaining, paidAmount: paidAmountEffective, total };
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

export function ExpensesCharts() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const q = useExpenses(user?.id);
  const entriesQ = useAllServiceEntries(user?.id);

  const { totals, byMonth, openByName } = useMemo(() => {
    const items: any[] = q.data ?? [];
    const entries: any[] = entriesQ.data ?? [];

    const months = monthWindow(selectedMonth);
    const monthMap = new Map<string, (typeof months)[number]>();
    for (const m of months) monthMap.set(m.key, m);

    let totalReceitas = 0;
    let totalDespesas = 0;
    let openRemainingTotal = 0;
    const openMap = new Map<string, number>();

    for (const e of entries) {
      const entryType = detectEntryType(e);
      if (entryType !== "receita") continue;
      const amountAbs = Math.abs(parseNumeric(e.amount) ?? 0);
      totalReceitas += amountAbs;

      const dateStr = (e.entry_date ?? e.created_at) as string;
      try {
        const d = parseISO(dateStr);
        const key = format(d, "yyyy-MM");
        const bucket = monthMap.get(key);
        if (bucket) bucket.receitas += amountAbs;
      } catch {
        // ignore
      }
    }

    for (const e of items) {
      const amount = parseNumeric(e.amount) ?? 0;
      totalDespesas += amount;

      try {
        const d = parseISO(e.expense_date);
        const key = format(d, "yyyy-MM");
        const bucket = monthMap.get(key);
        if (bucket) bucket.despesas += amount;
      } catch {
        // ignore
      }

      const payment = getExpensePaymentInfo(e);
      if (payment.remaining > 0) {
        openRemainingTotal += payment.remaining;
        const name = String(e.name ?? "(sem nome)");
        openMap.set(name, (openMap.get(name) ?? 0) + payment.remaining);
      }
    }

    const openByName = Array.from(openMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      totals: {
        receitas: totalReceitas,
        despesas: totalDespesas,
        saldo: totalReceitas - totalDespesas,
        openRemainingTotal,
        count: items.length,
      },
      byMonth: months,
      openByName,
    };
  }, [q.data, entriesQ.data, selectedMonth]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard title="Receitas" value={formatBRL(totals.receitas)} icon={Wallet} iconColor="bg-ios-green" />
        <IOSStatCard title="Despesas" value={formatBRL(totals.despesas)} icon={TrendingDown} iconColor="bg-ios-red" />
        <IOSStatCard title="Saldo" value={formatBRL(totals.saldo)} icon={Wallet} iconColor="bg-secondary" />
        <IOSStatCard title="Falta pagar" value={formatBRL(totals.openRemainingTotal)} icon={TrendingDown} iconColor="bg-ios-orange" />
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
            <BarChart data={openByName} layout="vertical" margin={{ left: 40, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="value" fill="hsl(var(--ios-orange))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!q.isLoading && openByName.length === 0 ? (
          <div className="mt-2 text-sm text-muted-foreground">Nenhuma despesa em aberto nos últimos meses.</div>
        ) : null}
      </IOSCard>

      {q.isLoading || entriesQ.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : null}
    </div>
  );
}

export function ExpensesReport() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const q = useExpenses(user?.id, selectedMonth);

  const rows = useMemo(() => {
    const items: any[] = q.data ?? [];
    return items
      .map((e) => {
        const amount = parseNumeric(e.amount) ?? 0;
        const payment = getExpensePaymentInfo(e);
        const status = payment.isPaid ? "Pago" : payment.isPartial ? "Abatido" : "Em aberto";
        return {
          id: e.id,
          name: String(e.name ?? ""),
          kind: kindLabel(e.kind as ExpenseKind),
          date: String(e.expense_date ?? ""),
          status,
          amount,
          remaining: payment.remaining,
        };
      })
      .filter((r) => r.remaining > 0)
      .sort((a, b) => (b.remaining || 0) - (a.remaining || 0))
      .slice(0, 20);
  }, [q.data]);

  return (
    <div className="space-y-3">
      <IOSCard className="p-4">
        <IOSSectionHeader title="Quem falta pagar" className="px-0" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Despesa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Resta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
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
                <TableCell>{r.kind}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(r.remaining)}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Nenhuma despesa em aberto no período.
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
