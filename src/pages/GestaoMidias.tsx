import { IOSPage } from "@/components/IOSPage";
import { IOSStatCard, IOSProgressCard } from "@/components/IOSStatCard";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { Share2, Instagram, Facebook, Linkedin, Youtube, TrendingUp, Users } from "lucide-react";

const socialAccounts = [
  { name: "Instagram", platform: "instagram", followers: "45.2K", engagement: "4.8%", icon: Instagram },
  { name: "Facebook", platform: "facebook", followers: "32.1K", engagement: "2.3%", icon: Facebook },
  { name: "LinkedIn", platform: "linkedin", followers: "12.8K", engagement: "5.1%", icon: Linkedin },
  { name: "YouTube", platform: "youtube", followers: "8.5K", engagement: "6.2%", icon: Youtube },
];

export default function GestaoMidias() {
  return (
    <IOSPage title="Gestão de Mídias">
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          icon={Share2}
          iconColor="bg-gradient-to-br from-pink-500 to-purple-600"
          title="Receita Mensal"
          value="R$ 48.500"
          trend="up"
          trendValue="15%"
          delay={50}
        />
        <IOSStatCard
          icon={Users}
          iconColor="bg-ios-blue"
          title="Clientes Ativos"
          value="24"
          trend="up"
          trendValue="3"
          delay={100}
        />
      </div>

      <IOSProgressCard
        title="Meta Mensal"
        current={48500}
        total={55000}
        color="bg-gradient-to-r from-pink-500 to-purple-600"
        delay={150}
      />

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Contas Gerenciadas" />
        <IOSCardGroup>
          {socialAccounts.map((account, index) => {
            const Icon = account.icon;
            return (
              <IOSListItem
                key={index}
                icon={<Icon className="w-4 h-4" />}
                iconBgColor={
                  account.platform === "instagram" ? "bg-gradient-to-br from-purple-600 to-pink-500" :
                  account.platform === "facebook" ? "bg-[#1877F2]" :
                  account.platform === "linkedin" ? "bg-[#0A66C2]" :
                  "bg-[#FF0000]"
                }
                title={account.name}
                subtitle={`${account.followers} seguidores`}
                value={account.engagement}
                showChevron
                onClick={() => {}}
              />
            );
          })}
        </IOSCardGroup>
      </div>

      <div className="animate-ios-fade-in opacity-0" style={{ animationDelay: "250ms", animationFillMode: "forwards" }}>
        <IOSSectionHeader title="Desempenho" />
        <IOSCardGroup>
          <IOSListItem
            icon={<TrendingUp className="w-4 h-4" />}
            iconBgColor="bg-ios-green"
            title="Engajamento Médio"
            value="4.6%"
          />
          <IOSListItem
            icon={<Users className="w-4 h-4" />}
            iconBgColor="bg-ios-teal"
            title="Alcance Total"
            value="1.2M"
          />
        </IOSCardGroup>
      </div>
    </IOSPage>
  );
}
