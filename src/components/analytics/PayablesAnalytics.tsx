import { IOSCard, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import { usePayables } from "@/hooks/usePayables";
import { formatBRL, parseNumeric } from "@/lib/domain";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText } from "lucide-react";
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

function isOverdue(dueDate: string) {
  const today = new Date();
  const d = new Date(`${dueDate}T00:00:00`);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d < t0;
}

const COLORS = [
  "hsl(var(--ios-red))",
  "hsl(var(--ios-green))",
  "hsl(var(--ios-orange))",
  "hsl(var(--ios-blue))",
  "hsl(var(--ios-purple))",
];

export function PayablesCharts() {
  const { selectedMonth } = useMonthFilter();
  const q = usePayables(selectedMonth);

  const { totals, byStatus, byVendor, byDueDay, overdueOpen } = useMemo(() => {
    const items: any[] = q.data ?? [];

    const totalAll = items.reduce((acc, p) => acc + (parseNumeric(p.amount) ?? 0), 0);
    const openTotal = items.filter((p) => p.status === "open").reduce((acc, p) => acc + (parseNumeric(p.amount) ?? 0), 0);

    const statusCounts = new Map<string, number>();
    const vendorMap = new Map<string, number>();
    const dayMap = new Map<string, number>();

    let overdue = 0;

    for (const p of items) {
      statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);

      const amount = parseNumeric(p.amount) ?? 0;
      const vendor = String(p.vendor ?? "(sem fornecedor)");
      if (p.status === "open") vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + amount);

      try {
        const d = parseISO(p.due_date);
        const day = format(d, "dd", { locale: ptBR });
        dayMap.set(day, (dayMap.get(day) ?? 0) + amount);
      } catch {
        // ignore
      }

      if (p.status === "open" && p.due_date && isOverdue(p.due_date)) overdue += 1;
    }

    const byStatus = [
      { name: "Em aberto", value: statusCounts.get("open") ?? 0 },
      { name: "Pago", value: statusCounts.get("paid") ?? 0 },
      { name: "Cancelado", value: statusCounts.get("canceled") ?? 0 },
    ];

    const byVendor = Array.from(vendorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const byDueDay = Array.from(dayMap.entries())
      .map(([day, value]) => ({ day, value }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    return {
      totals: { totalAll, openTotal, count: items.length },
      byStatus,
      byVendor,
      byDueDay,
      overdueOpen: overdue,
    };
  }, [q.data]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard title="Em aberto" value={formatBRL(totals.openTotal)} icon={FileText} iconColor="bg-ios-red" />
        <IOSStatCard title="Atrasadas" value={String(overdueOpen)} icon={FileText} iconColor="bg-ios-orange" />
      </div>

      <IOSCard className="p-4">
        <IOSSectionHeader title="Vencimento por dia" className="px-0" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDueDay} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="value" fill="hsl(var(--ios-orange))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </IOSCard>

      <div className="grid grid-cols-1 gap-3">
        <IOSCard className="p-4">
          <IOSSectionHeader title="Status" className="px-0" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {byStatus.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>

        <IOSCard className="p-4">
          <IOSSectionHeader title="Por fornecedor (aberto, top 6)" className="px-0" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVendor} layout="vertical" margin={{ left: 40, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
                <Bar dataKey="value" fill="hsl(var(--ios-red))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>
      </div>

      {q.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : null}
    </div>
  );
}

export function PayablesReport() {
  const { selectedMonth } = useMonthFilter();
  const q = usePayables(selectedMonth);

  const rows = useMemo(() => {
    const items: any[] = q.data ?? [];
    return items
      .filter((p) => p.status === "open")
      .map((p) => {
        const amount = parseNumeric(p.amount) ?? 0;
        const overdue = p.due_date ? isOverdue(p.due_date) : false;
        return {
          id: p.id,
          vendor: String(p.vendor ?? ""),
          due_date: String(p.due_date ?? ""),
          amount,
          overdue,
          description: p.description ? String(p.description) : "",
        };
      })
      .sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || a.due_date.localeCompare(b.due_date));
  }, [q.data]);

  return (
    <div className="space-y-3">
      <IOSCard className="p-4">
        <IOSSectionHeader title="Em aberto" className="px-0" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Venc.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.vendor}</div>
                  {r.description ? <div className="text-xs text-muted-foreground">{r.description}</div> : null}
                </TableCell>
                <TableCell>
                  {(() => {
                    try {
                      return format(parseISO(r.due_date), "dd/MM/yy", { locale: ptBR });
                    } catch {
                      return r.due_date;
                    }
                  })()}
                </TableCell>
                <TableCell>{r.overdue ? "Atrasado" : "Em aberto"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(r.amount)}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  Nenhuma conta em aberto no período.
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
