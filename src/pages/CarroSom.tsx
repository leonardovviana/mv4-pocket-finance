import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { Volume2, MapPin, Calendar, DollarSign, Clock, Megaphone } from "lucide-react";

const recentServices = [
  { client: "Eleições 2024", location: "Centro", date: "15 Nov", value: "R$ 2.500" },
  { client: "Inauguração Loja", location: "Shopping Norte", date: "12 Nov", value: "R$ 1.800" },
  { client: "Feira Municipal", location: "Praça Central", date: "10 Nov", value: "R$ 3.200" },
  { client: "Evento Corporativo", location: "Av. Principal", date: "08 Nov", value: "R$ 2.100" },
];

export default function CarroSom() {
  return (
    <IOSPage title="Carro de Som">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Volume2}
          iconColor="bg-ios-red"
          title="Receita Mensal"
          value="R$ 18.500"
          trend="up"
          trendValue="8%"
          delay={50}
        />
        <IOSStatCard
          icon={Megaphone}
          iconColor="bg-ios-orange"
          title="Serviços Mês"
          value="42"
          trend="up"
          trendValue="5"
          delay={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Clock}
          iconColor="bg-ios-purple"
          title="Horas Trabalhadas"
          value="156h"
          delay={150}
        />
        <IOSStatCard
          icon={MapPin}
          iconColor="bg-ios-teal"
          title="Cidades Atendidas"
          value="12"
          delay={200}
        />
      </div>

      <IOSProgressCard
        title="Meta Mensal"
        current={18500}
        total={22000}
        color="bg-ios-red"
        delay={250}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Serviços Recentes" />
        <IOSCardGroup>
          {recentServices.map((service, index) => (
            <IOSListItem
              key={index}
              icon={<Volume2 className="w-4 h-4" />}
              iconBgColor="bg-ios-red"
              title={service.client}
              subtitle={`${service.location} • ${service.date}`}
              value={service.value}
              showChevron
              onClick={() => {}}
            />
          ))}
        </IOSCardGroup>
      </div>

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "350ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Resumo" />
        <IOSCardGroup>
          <IOSListItem
            icon={<DollarSign className="w-4 h-4" />}
            iconBgColor="bg-ios-green"
            title="Ticket Médio"
            value="R$ 440"
          />
          <IOSListItem
            icon={<Calendar className="w-4 h-4" />}
            iconBgColor="bg-ios-blue"
            title="Próximos Agendados"
            value="8"
          />
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
