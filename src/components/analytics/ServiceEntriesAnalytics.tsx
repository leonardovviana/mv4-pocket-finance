import { IOSCard, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import { useServiceEntries } from "@/hooks/useServiceEntries";
import { formatBRL, parseNumeric, SERVICE_LABEL, type ServiceKey } from "@/lib/domain";
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

const COLORS = [
  "hsl(var(--ios-blue))",
  "hsl(var(--ios-green))",
  "hsl(var(--ios-orange))",
  "hsl(var(--ios-purple))",
  "hsl(var(--ios-red))",
];

export function ServiceEntriesCharts(props: { service: ServiceKey }) {
  const { user } = useAuth();
  const { selectedMonth } = useMonthFilter();
  const q = useServiceEntries(props.service, user?.id, selectedMonth);

  const { totals, byDay, byLabel, statusDist } = useMemo(() => {
    const items: any[] = q.data ?? [];

    let receita = 0;
    let despesas = 0;

    const dayMap = new Map<string, number>();
    const labelMap = new Map<string, number>();

    let open = 0;
    let paid = 0;
    let partial = 0;

    for (const e of items) {
      const amount = parseNumeric(e.amount) ?? 0;
      if (amount >= 0) receita += amount;
      else despesas += Math.abs(amount);

      const dateStr = e.entry_date ?? e.created_at;
      try {
        const d = parseISO(dateStr);
        const day = format(d, "dd", { locale: ptBR });
        dayMap.set(day, (dayMap.get(day) ?? 0) + Math.max(0, amount));
      } catch {
        // ignore
      }

      const label = groupLabelForService(props.service, e);
      labelMap.set(label, (labelMap.get(label) ?? 0) + Math.max(0, amount));

      const payment = getPaymentInfo(e);
      if (payment.isPaid) paid += 1;
      else if (payment.isPartial) partial += 1;
      else open += 1;
    }

    const byDay = Array.from(dayMap.entries())
      .map(([day, value]) => ({ day, value }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    const byLabel = Array.from(labelMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const statusDist = [
      { name: "Em aberto", value: open },
      { name: "Abatido", value: partial },
      { name: "Pago", value: paid },
    ];

    return {
      totals: { receita, despesas, count: items.length },
      byDay,
      byLabel,
      statusDist,
    };
  }, [q.data, props.service]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard title="Receita" value={formatBRL(totals.receita)} icon={FileText} iconColor="bg-ios-green" />
        <IOSStatCard title="Registros" value={String(totals.count)} icon={FileText} iconColor="bg-secondary" />
      </div>

      <IOSCard className="p-4">
        <IOSSectionHeader title="Receita por dia" className="px-0" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
              <Bar dataKey="value" fill="hsl(var(--ios-green))" radius={[6, 6, 0, 0]} />
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
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {statusDist.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>

        <IOSCard className="p-4">
          <IOSSectionHeader title="Por grupo (top 6)" className="px-0" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLabel} layout="vertical" margin={{ left: 40, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
                <Bar dataKey="value" fill="hsl(var(--ios-blue))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>
      </div>

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
        const amount = parseNumeric(e.amount) ?? 0;
        const payment = getPaymentInfo(e);
        const status = payment.isPaid ? "Pago" : payment.isPartial ? "Abatido" : "Em aberto";
        const dateStr = e.entry_date ?? e.created_at;

        return {
          id: e.id,
          title: String(e.title ?? ""),
          amount,
          status,
          date: String(dateStr ?? ""),
          label: groupLabelForService(props.service, e),
        };
      })
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 15);
  }, [q.data, props.service]);

  return (
    <div className="space-y-3">
      <IOSCard className="p-4">
        <IOSSectionHeader title={"Maiores recebimentos • " + (SERVICE_LABEL[props.service] ?? props.service)} className="px-0" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
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
                <TableCell>{r.status}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(Math.abs(r.amount))}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  Nenhum lançamento no período.
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
