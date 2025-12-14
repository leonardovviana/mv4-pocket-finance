import { IOSCard, IOSCardGroup, IOSListItem } from '@/components/IOSCard';
import { IOSPage } from '@/components/IOSPage';
import { IOSStatCard } from '@/components/IOSStatCard';
import { MonthFilter } from '@/components/MonthFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { CASH_ACCOUNTS, type CashAccountKey, useCashBalances, useUpsertCashBalances } from '@/hooks/useCashBalances';
import { useExpenses } from '@/hooks/useExpenses';
import { useMonthFilter } from '@/hooks/useMonthFilter';
import { useToast } from '@/hooks/use-toast';
import { useAllServiceEntries } from '@/hooks/useServiceEntries';
import { SERVICE_LABEL, formatBRL, parseNumeric } from '@/lib/domain';
import { addMonths, format, formatDistanceToNow, isWithinInterval, parseISO, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ArrowUpRight,
    DollarSign,
    FileText,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
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
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;

  const { toast } = useToast();

  const cashBalancesQuery = useCashBalances(userId);
  const upsertCashBalances = useUpsertCashBalances(userId);
  const [cashBalances, setCashBalances] = useState<Record<CashAccountKey, string>>(() =>
    Object.fromEntries(CASH_ACCOUNTS.map((a) => [a.key, '0,00'])) as Record<CashAccountKey, string>,
  );

  useEffect(() => {
    const rows = cashBalancesQuery.data ?? [];
    if (!rows.length) return;
    setCashBalances((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        const key = r.account as CashAccountKey;
        if (CASH_ACCOUNTS.some((a) => a.key === key)) {
          next[key] = String(r.balance ?? '0.00').replace('.', ',');
        }
      }
      return next;
    });
  }, [cashBalancesQuery.data]);

  const entriesQuery = useAllServiceEntries(userId);
  const expensesQuery = useExpenses(userId);

  const { selectedMonth } = useMonthFilter();

  const { revenueData, serviceDistribution, weeklyPerformance, totals, recentActivity } = useMemo(() => {
    const now = new Date();
    const entries = entriesQuery.data ?? [];
    const expenses = expensesQuery.data ?? [];

    const selectedStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const selectedEnd = startOfMonth(addMonths(selectedStart, 1));
    const selectedInterval = { start: selectedStart, end: selectedEnd };

    const entriesInMonth = entries.filter((e) => {
      const dateStr = e.entry_date ?? e.created_at;
      const d = parseISO(dateStr);
      return isWithinInterval(d, selectedInterval);
    });
    const expensesInMonth = expenses.filter((e) => {
      const d = parseISO(e.expense_date);
      return isWithinInterval(d, selectedInterval);
    });

    const entryAmounts = entriesInMonth.map((e) => parseNumeric(e.amount) ?? 0);
    const receitaEntradas = entryAmounts.reduce((acc, v) => acc + (v > 0 ? v : 0), 0);
    const despesasEntradas = entryAmounts.reduce((acc, v) => acc + (v < 0 ? -v : 0), 0);

    const despesasLancadas = expensesInMonth.reduce((acc, curr) => acc + (parseNumeric(curr.amount) ?? 0), 0);

    const totalReceita = receitaEntradas;
    const totalDespesas = despesasLancadas + despesasEntradas;
    const lucroLiquido = totalReceita - totalDespesas;
    const margemLucro = totalReceita > 0 ? (lucroLiquido / totalReceita) * 100 : 0;

    // Últimos 6 meses (inclui mês atual)
    const start = startOfMonth(subMonths(now, 5));
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
    const revenueData = months.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = startOfMonth(subMonths(monthDate, -1));
      const interval = { start: monthStart, end: monthEnd };

      const receita = entries.reduce((acc, e) => {
        const dateStr = e.entry_date ?? e.created_at;
        const d = parseISO(dateStr);
        if (!isWithinInterval(d, interval)) return acc;
        const a = parseNumeric(e.amount) ?? 0;
        return acc + (a > 0 ? a : 0);
      }, 0);

      const despesas = expenses.reduce((acc, e) => {
        const d = parseISO(e.expense_date);
        if (!isWithinInterval(d, interval)) return acc;
        return acc + (parseNumeric(e.amount) ?? 0);
      }, 0);

      const despesasEntries = entries.reduce((acc, e) => {
        const dateStr = e.entry_date ?? e.created_at;
        const d = parseISO(dateStr);
        if (!isWithinInterval(d, interval)) return acc;
        const a = parseNumeric(e.amount) ?? 0;
        return acc + (a < 0 ? -a : 0);
      }, 0);

      return {
        month: format(monthDate, 'MMM', { locale: ptBR }),
        receita,
        despesas: despesas + despesasEntries,
      };
    });

    // Distribuição por serviço (por valor)
    const byService = new Map<string, number>();
    for (const e of entriesInMonth) {
      const key = e.service;
      const a = parseNumeric(e.amount) ?? 0;
      if (a <= 0) continue;
      byService.set(key, (byService.get(key) ?? 0) + a);
    }

    const colors = [
      { fill: 'hsl(var(--ios-blue))', dotClass: 'bg-ios-blue' },
      { fill: 'hsl(var(--ios-green))', dotClass: 'bg-ios-green' },
      { fill: 'hsl(var(--ios-orange))', dotClass: 'bg-ios-orange' },
      { fill: 'hsl(var(--ios-purple))', dotClass: 'bg-ios-purple' },
    ];

    const ranked = Array.from(byService.entries())
      .map(([service, total]) => ({ service, total }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);

    const totalDistribuicao = ranked.reduce((acc, curr) => acc + curr.total, 0);
    const top = ranked.slice(0, 4);
    const rest = ranked.slice(4);
    const outrosTotal = rest.reduce((acc, curr) => acc + curr.total, 0);

    const dist = top.map((item, idx) => ({
      name: SERVICE_LABEL[item.service as keyof typeof SERVICE_LABEL] ?? item.service,
      value: totalDistribuicao > 0 ? Math.round((item.total / totalDistribuicao) * 100) : 0,
      color: (colors[idx] ?? colors[0]).fill,
      colorClass: (colors[idx] ?? colors[0]).dotClass,
    }));
    if (outrosTotal > 0) {
      dist.push({
        name: 'Outros',
        value: Math.max(1, 100 - dist.reduce((a, b) => a + b.value, 0)),
        color: 'hsl(var(--muted-foreground))',
        colorClass: 'bg-muted-foreground',
      });
    }

    // Últimos 7 dias: número de cadastros por dia
    const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(now, 6 - i)));
    const weeklyPerformance = days.map((dayDate) => {
      const dayStart = startOfDay(dayDate);
      const dayEnd = startOfDay(subDays(dayDate, -1));
      const interval = { start: dayStart, end: dayEnd };
      const vendas = entries.reduce((acc, e) => {
        const dateStr = e.entry_date ?? e.created_at;
        const d = parseISO(dateStr);
        if (!isWithinInterval(d, interval)) return acc;
        return acc + 1;
      }, 0);
      return {
        day: format(dayDate, 'EEE', { locale: ptBR }).replace('.', ''),
        vendas,
      };
    });

    // Atividade recente (últimos 4 itens)
    const activity = [
      ...entries.map((e) => ({
        type: 'entry' as const,
        at: parseISO(e.created_at),
        title: e.title,
        subtitle: SERVICE_LABEL[e.service as keyof typeof SERVICE_LABEL] ?? e.service,
      })),
      ...expenses.map((e) => ({
        type: 'expense' as const,
        at: parseISO(e.created_at),
        title: e.name,
        subtitle: `Despesa • ${e.kind}`,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 4)
      .map((a) => ({
        icon: a.type === 'expense' ? TrendingDown : FileText,
        title: a.type === 'expense' ? 'Despesa cadastrada' : 'Cadastro criado',
        subtitle: `${a.title} • ${a.subtitle}`,
        time: formatDistanceToNow(a.at, { addSuffix: true, locale: ptBR }),
        color: a.type === 'expense' ? 'text-ios-red' : 'text-primary',
      }));

    return {
      revenueData,
      serviceDistribution: dist.length
        ? dist
        : [{ name: 'Sem dados', value: 100, color: 'hsl(var(--muted))', colorClass: 'bg-muted' }],
      weeklyPerformance,
      totals: {
        totalReceita,
        totalDespesas,
        lucroLiquido,
        margemLucro,
        registros: entriesInMonth.length,
      },
      recentActivity: activity,
    };
  }, [entriesQuery.data, expensesQuery.data, selectedMonth]);

  return (
    <IOSPage title="Dashboard" showLargeTitle={true}>
      <div className="space-y-6 pb-8">
        <MonthFilter />

        <IOSCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="ios-headline text-foreground">Saldo em caixa</h3>
              <p className="text-xs text-muted-foreground">Atualize manualmente (não é calculado)</p>
            </div>
            <Button
              size="sm"
              disabled={!userId || upsertCashBalances.isPending}
              onClick={async () => {
                try {
                  await upsertCashBalances.mutateAsync(
                    CASH_ACCOUNTS.map((a) => ({ account: a.key, balance: cashBalances[a.key] ?? '0' })),
                  );
                  toast({ title: 'Saldos atualizados' });
                } catch (e: any) {
                  toast({ title: 'Erro ao salvar', description: e?.message ?? String(e), variant: 'destructive' });
                }
              }}
            >
              Salvar
            </Button>
          </div>

          <IOSCardGroup>
            {CASH_ACCOUNTS.map((a) => (
              <IOSListItem
                key={a.key}
                icon={null}
                iconBgColor="bg-secondary"
                title={a.label}
                value={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={cashBalances[a.key] ?? ''}
                      onChange={(e) => setCashBalances((prev) => ({ ...prev, [a.key]: e.target.value }))}
                      className="h-8 w-[120px] text-right"
                    />
                  </div>
                }
              />
            ))}
          </IOSCardGroup>
        </IOSCard>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <IOSStatCard
            title="Receita Total"
            value={formatBRL(totals.totalReceita)}
            icon={DollarSign}
            iconColor="bg-primary"
          />
          <IOSStatCard
            title="Despesas"
            value={formatBRL(totals.totalDespesas)}
            icon={TrendingDown}
            iconColor="bg-ios-red"
          />
          <IOSStatCard
            title="Lucro Líquido"
            value={formatBRL(totals.lucroLiquido)}
            icon={TrendingUp}
            iconColor="bg-ios-green"
            trend={totals.lucroLiquido >= 0 ? 'up' : 'down'}
            trendValue={`${totals.margemLucro.toFixed(1)}%`}
          />
          <IOSStatCard
            title="Cadastros"
            value={String(totals.registros)}
            icon={FileText}
            iconColor="bg-secondary"
          />
        </div>

        {/* Revenue Chart */}
        <IOSCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="ios-headline text-foreground">Receita vs Despesas</h3>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--ios-green))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--ios-green))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--ios-red))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--ios-red))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="receita" 
                  stroke="hsl(var(--ios-green))" 
                  fillOpacity={1} 
                  fill="url(#colorReceita)" 
                  name="Receita"
                />
                <Area 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="hsl(var(--ios-red))" 
                  fillOpacity={1} 
                  fill="url(#colorDespesas)" 
                  name="Despesas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>

        {/* Service Distribution */}
        <IOSCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="ios-headline text-foreground">Distribuição por Serviço</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[150px] w-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {serviceDistribution.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${service.colorClass}`} />
                    <span className="text-sm text-foreground">{service.name}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{service.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </IOSCard>

        {/* Weekly Performance */}
        <IOSCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="ios-headline text-foreground">Vendas da Semana</h3>
            <div className="flex items-center gap-1 text-ios-green">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-sm font-medium">Últimos 7 dias</span>
            </div>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar 
                  dataKey="vendas" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Vendas"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IOSCard>

        {/* Recent Activity */}
        <IOSCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="ios-headline text-foreground">Atividade Recente</h3>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="py-2">
                <p className="text-sm text-muted-foreground">Sem atividade recente.</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                  <div className={`h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center ${activity.color}`}>
                    <activity.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))
            )}
          </div>
        </IOSCard>
      </div>
    </IOSPage>
  );
}
