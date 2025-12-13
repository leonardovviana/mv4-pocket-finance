import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { Trophy, TrendingUp, Users, Star, DollarSign } from "lucide-react";

const recentWinners = [
  { name: "Campanha Digital Q4", category: "Marketing Digital", prize: "R$ 15.000" },
  { name: "Branding Corporativo", category: "Design", prize: "R$ 12.500" },
  { name: "Vídeo Institucional", category: "Audiovisual", prize: "R$ 18.000" },
];

export default function MelhoresDoAno() {
  return (
    <IOSPage title="Melhores do Ano">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Trophy}
          iconColor="bg-ios-yellow"
          title="Total Premiações"
          value="R$ 125.500"
          trend="up"
          trendValue="12%"
          delay={50}
        />
        <IOSStatCard
          icon={Users}
          iconColor="bg-ios-blue"
          title="Participantes"
          value="48"
          trend="up"
          trendValue="8"
          delay={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Star}
          iconColor="bg-ios-orange"
          title="Projetos Inscritos"
          value="156"
          delay={150}
        />
        <IOSStatCard
          icon={TrendingUp}
          iconColor="bg-ios-green"
          title="Taxa de Sucesso"
          value="87%"
          delay={200}
        />
      </div>

      <IOSProgressCard
        title="Meta Anual"
        current={125500}
        total={150000}
        color="bg-ios-yellow"
        delay={250}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Últimos Vencedores" />
        <IOSCardGroup>
          {recentWinners.map((winner, index) => (
            <IOSListItem
              key={index}
              icon={<Trophy className="w-4 h-4" />}
              iconBgColor="bg-ios-yellow"
              title={winner.name}
              subtitle={winner.category}
              value={winner.prize}
              showChevron
              onClick={() => {}}
            />
          ))}
        </IOSCardGroup>
      </div>

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "350ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Resumo Financeiro" />
        <IOSCardGroup>
          <IOSListItem
            icon={<DollarSign className="w-4 h-4" />}
            iconBgColor="bg-ios-green"
            title="Valor Total Distribuído"
            value="R$ 125.500"
          />
          <IOSListItem
            icon={<Star className="w-4 h-4" />}
            iconBgColor="bg-ios-purple"
            title="Média por Prêmio"
            value="R$ 8.366"
          />
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
