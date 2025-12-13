import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { Award, Star, Users, Trophy, Medal, Crown } from "lucide-react";

const nominees = [
  { name: "João Silva", department: "Criação", votes: 145, position: 1 },
  { name: "Maria Santos", department: "Atendimento", votes: 132, position: 2 },
  { name: "Pedro Costa", department: "Marketing", votes: 128, position: 3 },
  { name: "Ana Oliveira", department: "Design", votes: 115, position: 4 },
];

export default function PremioExcelencia() {
  return (
    <IOSPage title="Prêmio Excelência">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Award}
          iconColor="bg-gradient-to-br from-amber-400 to-amber-600"
          title="Valor Total"
          value="R$ 35.000"
          trend="up"
          trendValue="20%"
          delay={50}
        />
        <IOSStatCard
          icon={Users}
          iconColor="bg-ios-purple"
          title="Participantes"
          value="87"
          trend="up"
          trendValue="12"
          delay={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Star}
          iconColor="bg-ios-orange"
          title="Categorias"
          value="6"
          delay={150}
        />
        <IOSStatCard
          icon={Trophy}
          iconColor="bg-ios-teal"
          title="Votos Totais"
          value="1.245"
          delay={200}
        />
      </div>

      <IOSProgressCard
        title="Período de Votação"
        current={75}
        total={100}
        color="bg-gradient-to-r from-amber-400 to-amber-600"
        delay={250}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Ranking Atual" />
        <IOSCardGroup>
          {nominees.map((nominee, index) => (
            <IOSListItem
              key={index}
              icon={
                nominee.position === 1 ? <Crown className="w-4 h-4" /> :
                nominee.position === 2 ? <Medal className="w-4 h-4" /> :
                nominee.position === 3 ? <Award className="w-4 h-4" /> :
                <Star className="w-4 h-4" />
              }
              iconBgColor={
                nominee.position === 1 ? "bg-amber-500" :
                nominee.position === 2 ? "bg-gray-400" :
                nominee.position === 3 ? "bg-amber-700" :
                "bg-ios-gray-2"
              }
              title={nominee.name}
              subtitle={nominee.department}
              value={`${nominee.votes} votos`}
              showChevron
              onClick={() => {}}
            />
          ))}
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
