import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { Briefcase, Camera, Palette, Video, Code, Printer, PenTool, DollarSign } from "lucide-react";

const services = [
  { name: "Fotografia Profissional", icon: Camera, count: 28, revenue: "R$ 42.000", color: "bg-ios-purple" },
  { name: "Design Gráfico", icon: Palette, count: 45, revenue: "R$ 67.500", color: "bg-ios-pink" },
  { name: "Produção de Vídeo", icon: Video, count: 12, revenue: "R$ 84.000", color: "bg-ios-red" },
  { name: "Desenvolvimento Web", icon: Code, count: 8, revenue: "R$ 56.000", color: "bg-ios-blue" },
  { name: "Impressão Gráfica", icon: Printer, count: 156, revenue: "R$ 31.200", color: "bg-ios-orange" },
  { name: "Identidade Visual", icon: PenTool, count: 15, revenue: "R$ 45.000", color: "bg-ios-teal" },
];

export default function ServicosVariados() {
  return (
    <IOSPage title="Serviços Variados">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Briefcase}
          iconColor="bg-ios-blue"
          title="Receita Total"
          value="R$ 325.700"
          trend="up"
          trendValue="15%"
          delay={50}
        />
        <IOSStatCard
          icon={DollarSign}
          iconColor="bg-ios-green"
          title="Projetos Ativos"
          value="64"
          trend="up"
          trendValue="12"
          delay={100}
        />
      </div>

      <IOSProgressCard
        title="Meta Anual"
        current={325700}
        total={400000}
        color="bg-ios-blue"
        delay={150}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Serviços por Categoria" />
        <IOSCardGroup>
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <IOSListItem
                key={index}
                icon={<Icon className="w-4 h-4" />}
                iconBgColor={service.color}
                title={service.name}
                subtitle={`${service.count} projetos`}
                value={service.revenue}
                showChevron
                onClick={() => {}}
              />
            );
          })}
        </IOSCardGroup>
      </div>

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "250ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Resumo do Mês" />
        <IOSCardGroup>
          <IOSListItem
            icon={<DollarSign className="w-4 h-4" />}
            iconBgColor="bg-ios-green"
            title="Ticket Médio"
            value="R$ 1.225"
          />
          <IOSListItem
            icon={<Briefcase className="w-4 h-4" />}
            iconBgColor="bg-ios-purple"
            title="Novos Projetos"
            value="18"
          />
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
