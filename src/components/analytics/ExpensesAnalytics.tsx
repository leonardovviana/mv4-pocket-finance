import { IOSCard, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/hooks/useExpenses";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import { formatBRL, parseNumeric, type ExpenseKind } from "@/lib/domain";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, Wallet } from "lucide-react";
import { useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
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

const COLORS = [
  "hsl(var(--ios-blue))",
  "hsl(var(--ios-green))",
  "hsl(var(--ios-orange))",
  "hsl(var(--ios-purple))",
  "hsl(var(--ios-red))",
];

export function ExpensesCharts() {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const q = useExpenses(user?.id, selectedMonth);

  const { totals, byKind, byPaymentMethod, byDay, openPaid } = useMemo(() => {
    const items: any[] = q.data ?? [];

    const total = items.reduce((acc, e) => acc + (parseNumeric(e.amount) ?? 0), 0);
    const count = items.length;

    const kindMap = new Map<string, number>();
    const methodMap = new Map<string, number>();
    const dayMap = new Map<string, number>();

    let open = 0;
    let paid = 0;
    let partial = 0;

    for (const e of items) {
      const amount = parseNumeric(e.amount) ?? 0;
      const kind = e.kind as ExpenseKind;
      kindMap.set(kind, (kindMap.get(kind) ?? 0) + amount);

      const method = typeof e.payment_method === "string" && e.payment_method.trim() ? e.payment_method.trim() : "(sem método)";
      methodMap.set(method, (methodMap.get(method) ?? 0) + amount);

      try {
        const d = parseISO(e.expense_date);
        const day = format(d, "dd", { locale: ptBR });
        dayMap.set(day, (dayMap.get(day) ?? 0) + amount);
      } catch {
        // ignore
      }

      const payment = getExpensePaymentInfo(e);
      if (payment.isPaid) paid += 1;
      else if (payment.isPartial) partial += 1;
      else open += 1;
    }

    const byKind = Array.from(kindMap.entries())
      .map(([k, v]) => ({ name: kindLabel(k as ExpenseKind), value: v }))
      .sort((a, b) => b.value - a.value);

    const byPaymentMethod = Array.from(methodMap.entries())
      .map(([k, v]) => ({ name: k, value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const byDay = Array.from(dayMap.entries())
      .map(([day, value]) => ({ day, value }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    return {
      totals: { total, count },
      byKind,
      byPaymentMethod,
      byDay,
      openPaid: [
        { name: "Em aberto", value: open },
        { name: "Abatido", value: partial },
        { name: "Pago", value: paid },
      ],
    };
  }, [q.data]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard title="Total" value={formatBRL(totals.total)} icon={Wallet} iconColor="bg-ios-red" />
        <IOSStatCard title="Registros" value={String(totals.count)} icon={TrendingDown} iconColor="bg-secondary" />
      </div>

      <IOSCard className="p-4">
        <IOSSectionHeader title="Despesas por dia" className="px-0" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="value" fill="hsl(var(--ios-red))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </IOSCard>

      <div className="grid grid-cols-1 gap-3">
        <IOSCard className="p-4">
          <IOSSectionHeader title="Por tipo" className="px-0" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byKind} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {byKind.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>

        <IOSCard className="p-4">
          <IOSSectionHeader title="Status" className="px-0" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={openPaid} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {openPaid.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>
      </div>

      <IOSCard className="p-4">
        <IOSSectionHeader title="Por método (top 6)" className="px-0" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byPaymentMethod} layout="vertical" margin={{ left: 40, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="value" fill="hsl(var(--ios-purple))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </IOSCard>

      {q.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : null}
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
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);
  }, [q.data]);

  return (
    <div className="space-y-3">
      <IOSCard className="p-4">
        <IOSSectionHeader title="Maiores despesas (top 15)" className="px-0" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Despesa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
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
                <TableCell>{r.status}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(r.amount)}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  Nenhuma despesa no período.
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
