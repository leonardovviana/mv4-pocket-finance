import { cn } from "@/lib/utils";
import {
    Award,
    BookOpen,
    Briefcase,
    Heart,
    LayoutDashboard,
    MessageCircle,
    Share2,
    Trophy,
    User,
    Volume2,
    Wallet
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const tabs: TabItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "melhores", label: "Melhores", icon: Trophy, path: "/melhores" },
  { id: "midias", label: "Mídias", icon: Share2, path: "/midias" },
  { id: "premio", label: "Prêmio", icon: Award, path: "/premio" },
  { id: "carro", label: "Carro Som", icon: Volume2, path: "/carro-som" },
  { id: "factus", label: "Factus", icon: BookOpen, path: "/factus" },
  { id: "saude", label: "Saúde", icon: Heart, path: "/saude" },
  { id: "servicos", label: "Serviços", icon: Briefcase, path: "/servicos" },
  { id: "despesas", label: "Despesas", icon: Wallet, path: "/despesas" },
  { id: "chat", label: "Chat", icon: MessageCircle, path: "/chat" },
  { id: "perfil", label: "Perfil", icon: User, path: "/perfil" },
];

export function IOSTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 ios-blur bg-tabBar/80 border-t border-tabBar-border ios-tab-bar-height">
      <div className="ios-scroll flex items-start gap-2 pt-2 px-2 overflow-x-auto w-full max-w-lg mx-auto md:overflow-x-visible md:max-w-none md:justify-around md:gap-0 md:px-6">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] py-1 ios-tap flex-shrink-0 md:flex-1 md:min-w-0 md:flex-shrink",
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
