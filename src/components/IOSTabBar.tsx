import { useLocation, useNavigate } from "react-router-dom";
import { 
  Trophy, 
  Share2, 
  Award, 
  Volume2, 
  BookOpen, 
  Heart, 
  Briefcase, 
  Wallet 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const tabs: TabItem[] = [
  { id: "melhores", label: "Melhores", icon: Trophy, path: "/" },
  { id: "midias", label: "Mídias", icon: Share2, path: "/midias" },
  { id: "premio", label: "Prêmio", icon: Award, path: "/premio" },
  { id: "carro", label: "Carro Som", icon: Volume2, path: "/carro-som" },
  { id: "factus", label: "Factus", icon: BookOpen, path: "/factus" },
  { id: "saude", label: "Saúde", icon: Heart, path: "/saude" },
  { id: "servicos", label: "Serviços", icon: Briefcase, path: "/servicos" },
  { id: "despesas", label: "Despesas", icon: Wallet, path: "/despesas" },
];

export function IOSTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 ios-blur bg-tabBar/80 border-t border-tabBar-border ios-tab-bar-height">
      <div className="flex items-start justify-around pt-2 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[44px] py-1 ios-tap",
                "transition-colors duration-200"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6 mb-0.5 transition-colors duration-200",
                  isActive ? "text-tabBar-active" : "text-tabBar-inactive"
                )} 
              />
              <span 
                className={cn(
                  "ios-caption2 transition-colors duration-200",
                  isActive ? "text-tabBar-active" : "text-tabBar-inactive"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
