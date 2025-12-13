import { IOSPage } from '@/components/IOSPage';
import { IOSCard } from '@/components/IOSCard';
import { IOSStatCard } from '@/components/IOSStatCard';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Mock data for charts
const revenueData = [
  { month: 'Jan', receita: 45000, despesas: 32000 },
  { month: 'Fev', receita: 52000, despesas: 35000 },
  { month: 'Mar', receita: 48000, despesas: 30000 },
  { month: 'Abr', receita: 61000, despesas: 38000 },
  { month: 'Mai', receita: 55000, despesas: 34000 },
  { month: 'Jun', receita: 67000, despesas: 41000 },
];

const serviceDistribution = [
  { name: 'Mídias Sociais', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Carro de Som', value: 25, color: 'hsl(var(--chart-2))' },
  { name: 'Revista Factus', value: 20, color: 'hsl(var(--chart-3))' },
  { name: 'Serviços Variados', value: 20, color: 'hsl(var(--chart-4))' },
];

const weeklyPerformance = [
  { day: 'Seg', vendas: 12 },
  { day: 'Ter', vendas: 19 },
  { day: 'Qua', vendas: 15 },
  { day: 'Qui', vendas: 22 },
  { day: 'Sex', vendas: 28 },
  { day: 'Sáb', vendas: 8 },
  { day: 'Dom', vendas: 5 },
];

export default function Dashboard() {
  const totalReceita = revenueData.reduce((acc, curr) => acc + curr.receita, 0);
  const totalDespesas = revenueData.reduce((acc, curr) => acc + curr.despesas, 0);
  const lucroLiquido = totalReceita - totalDespesas;
  const margemLucro = ((lucroLiquido / totalReceita) * 100).toFixed(1);

  return (
    <IOSPage title="Dashboard" showLargeTitle={true}>
      <div className="space-y-6 pb-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <IOSStatCard
            title="Receita Total"
            value={`R$ ${(totalReceita / 1000).toFixed(0)}k`}
            icon={DollarSign}
            iconColor="bg-primary"
            trend="up"
            trendValue="+12.5%"
          />
          <IOSStatCard
            title="Despesas"
            value={`R$ ${(totalDespesas / 1000).toFixed(0)}k`}
            icon={TrendingDown}
            iconColor="bg-ios-red"
            trend="down"
            trendValue="-3.2%"
          />
          <IOSStatCard
            title="Lucro Líquido"
            value={`R$ ${(lucroLiquido / 1000).toFixed(0)}k`}
            icon={TrendingUp}
            iconColor="bg-ios-green"
            trend="up"
            trendValue={`+${margemLucro}%`}
          />
          <IOSStatCard
            title="Clientes Ativos"
            value="127"
            icon={Users}
            iconColor="bg-chart-2"
            trend="up"
            trendValue="+8"
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
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
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
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorReceita)" 
                  name="Receita"
                />
                <Area 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="hsl(var(--destructive))" 
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
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: service.color }}
                    />
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
              <span className="text-sm font-medium">+23%</span>
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
            {[
              { icon: FileText, title: 'Nova proposta enviada', subtitle: 'Cliente: Loja ABC', time: 'Há 2 horas', color: 'text-primary' },
              { icon: DollarSign, title: 'Pagamento recebido', subtitle: 'R$ 2.500,00', time: 'Há 5 horas', color: 'text-ios-green' },
              { icon: Users, title: 'Novo cliente cadastrado', subtitle: 'Maria Silva', time: 'Há 1 dia', color: 'text-chart-2' },
              { icon: Calendar, title: 'Reunião agendada', subtitle: 'Apresentação de projeto', time: 'Há 2 dias', color: 'text-chart-3' },
            ].map((activity, index) => (
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
            ))}
          </div>
        </IOSCard>
      </div>
    </IOSPage>
  );
}
