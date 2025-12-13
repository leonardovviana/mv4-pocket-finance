import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { Wallet, Building, Zap, Wifi, Phone, Car, Coffee, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

const fixedExpenses = [
  { name: "Aluguel Escritório", icon: Building, value: "R$ 4.500", dueDate: "Dia 10" },
  { name: "Energia Elétrica", icon: Zap, value: "R$ 850", dueDate: "Dia 15" },
  { name: "Internet/Telefone", icon: Wifi, value: "R$ 380", dueDate: "Dia 20" },
  { name: "Plano Celular", icon: Phone, value: "R$ 420", dueDate: "Dia 05" },
  { name: "Seguro Empresarial", icon: ShieldCheck, value: "R$ 650", dueDate: "Dia 01" },
];

const variableExpenses = [
  { name: "Combustível", value: "R$ 1.200", trend: "up" as const },
  { name: "Material Escritório", value: "R$ 340", trend: "down" as const },
  { name: "Alimentação Equipe", value: "R$ 890", trend: "up" as const },
  { name: "Manutenção Veículos", value: "R$ 580", trend: "neutral" as const },
];

export default function Despesas() {
  return (
    <IOSPage title="Despesas">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Wallet}
          iconColor="bg-ios-red"
          title="Total Mensal"
          value="R$ 12.450"
          trend="down"
          trendValue="5%"
          delay={50}
        />
        <IOSStatCard
          icon={Building}
          iconColor="bg-ios-orange"
          title="Fixas"
          value="R$ 6.800"
          delay={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={TrendingDown}
          iconColor="bg-ios-green"
          title="Variáveis"
          value="R$ 3.010"
          trend="down"
          trendValue="12%"
          delay={150}
        />
        <IOSStatCard
          icon={TrendingUp}
          iconColor="bg-ios-purple"
          title="Provisões"
          value="R$ 2.640"
          delay={200}
        />
      </div>

      <IOSProgressCard
        title="Orçamento Mensal"
        current={12450}
        total={15000}
        color="bg-ios-red"
        delay={250}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Despesas Fixas" />
        <IOSCardGroup>
          {fixedExpenses.map((expense, index) => {
            const Icon = expense.icon;
            return (
              <IOSListItem
                key={index}
                icon={<Icon className="w-4 h-4" />}
                iconBgColor="bg-ios-orange"
                title={expense.name}
                subtitle={`Vencimento: ${expense.dueDate}`}
                value={expense.value}
                showChevron
                onClick={() => {}}
              />
            );
          })}
        </IOSCardGroup>
      </div>

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "350ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Despesas Variáveis" />
        <IOSCardGroup>
          {variableExpenses.map((expense, index) => (
            <IOSListItem
              key={index}
              icon={
                expense.trend === "up" ? <TrendingUp className="w-4 h-4" /> :
                expense.trend === "down" ? <TrendingDown className="w-4 h-4" /> :
                <Wallet className="w-4 h-4" />
              }
              iconBgColor={
                expense.trend === "up" ? "bg-ios-red" :
                expense.trend === "down" ? "bg-ios-green" :
                "bg-ios-gray-2"
              }
              title={expense.name}
              value={expense.value}
              showChevron
              onClick={() => {}}
            />
          ))}
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
