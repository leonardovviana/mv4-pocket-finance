import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { BookOpen, FileText, Users, DollarSign, Calendar, Newspaper } from "lucide-react";

const recentEditions = [
  { name: "Edição 156", date: "Novembro 2024", pages: 48, value: "R$ 28.500" },
  { name: "Edição 155", date: "Outubro 2024", pages: 52, value: "R$ 31.200" },
  { name: "Edição 154", date: "Setembro 2024", pages: 44, value: "R$ 26.800" },
  { name: "Edição Especial", date: "Agosto 2024", pages: 64, value: "R$ 42.000" },
];

export default function RevistaFactus() {
  return (
    <IOSPage title="Revista Factus">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={BookOpen}
          iconColor="bg-ios-blue"
          title="Receita Anual"
          value="R$ 385.000"
          trend="up"
          trendValue="18%"
          delay={50}
        />
        <IOSStatCard
          icon={Newspaper}
          iconColor="bg-ios-purple"
          title="Edições Ano"
          value="12"
          delay={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Users}
          iconColor="bg-ios-orange"
          title="Anunciantes"
          value="86"
          trend="up"
          trendValue="14"
          delay={150}
        />
        <IOSStatCard
          icon={FileText}
          iconColor="bg-ios-teal"
          title="Tiragem Média"
          value="5.000"
          delay={200}
        />
      </div>

      <IOSProgressCard
        title="Meta Anual"
        current={385000}
        total={420000}
        color="bg-ios-blue"
        delay={250}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Últimas Edições" />
        <IOSCardGroup>
          {recentEditions.map((edition, index) => (
            <IOSListItem
              key={index}
              icon={<BookOpen className="w-4 h-4" />}
              iconBgColor="bg-ios-blue"
              title={edition.name}
              subtitle={`${edition.date} • ${edition.pages} páginas`}
              value={edition.value}
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
            title="Data de Fechamento"
            value="25 Nov"
          />
          <IOSListItem
            icon={<DollarSign className="w-4 h-4" />}
            iconBgColor="bg-ios-yellow"
            title="Vendas Confirmadas"
            value="R$ 24.500"
          />
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
