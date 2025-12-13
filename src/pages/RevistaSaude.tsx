import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { Heart, Stethoscope, Users, DollarSign, Calendar, Building } from "lucide-react";

const healthPartners = [
  { name: "Hospital São Lucas", type: "Hospital", contract: "R$ 15.000/mês" },
  { name: "Clínica Vida", type: "Clínica", contract: "R$ 8.500/mês" },
  { name: "Laboratório Central", type: "Laboratório", contract: "R$ 6.200/mês" },
  { name: "Farmácia Popular", type: "Farmácia", contract: "R$ 4.800/mês" },
];

export default function RevistaSaude() {
  return (
    <IOSPage title="Factus Saúde">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Heart}
          iconColor="bg-ios-red"
          title="Receita Anual"
          value="R$ 245.000"
          trend="up"
          trendValue="22%"
          delay={50}
        />
        <IOSStatCard
          icon={Stethoscope}
          iconColor="bg-ios-teal"
          title="Edições Ano"
          value="6"
          delay={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Building}
          iconColor="bg-ios-purple"
          title="Parceiros Saúde"
          value="34"
          trend="up"
          trendValue="8"
          delay={150}
        />
        <IOSStatCard
          icon={Users}
          iconColor="bg-ios-orange"
          title="Profissionais"
          value="128"
          delay={200}
        />
      </div>

      <IOSProgressCard
        title="Meta Anual"
        current={245000}
        total={280000}
        color="bg-ios-red"
        delay={250}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Parceiros em Destaque" />
        <IOSCardGroup>
          {healthPartners.map((partner, index) => (
            <IOSListItem
              key={index}
              icon={<Heart className="w-4 h-4" />}
              iconBgColor="bg-ios-red"
              title={partner.name}
              subtitle={partner.type}
              value={partner.contract}
              showChevron
              onClick={() => {}}
            />
          ))}
        </IOSCardGroup>
      </div>

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "350ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Próxima Edição" />
        <IOSCardGroup>
          <IOSListItem
            icon={<Calendar className="w-4 h-4" />}
            iconBgColor="bg-ios-green"
            title="Tema Principal"
            value="Saúde Mental"
          />
          <IOSListItem
            icon={<DollarSign className="w-4 h-4" />}
            iconBgColor="bg-ios-yellow"
            title="Vendas Confirmadas"
            value="R$ 18.200"
          />
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
