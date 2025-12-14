import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface IOSStatCardProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  delay?: number;
}

export function IOSStatCard({
  icon: Icon,
  iconColor,
  title,
  value,
  subtitle,
  trend,
  trendValue,
  className,
  delay = 0,
}: IOSStatCardProps) {
  const iconTextClassName = iconColor.includes("bg-secondary")
    ? "text-secondary-foreground"
    : iconColor.includes("bg-muted")
      ? "text-foreground"
      : "text-primary-foreground";

  return (
    <div 
      className={cn(
        "ios-card animate-ios-fade-in opacity-0",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          iconColor
        )}>
          <Icon className={cn("w-5 h-5", iconTextClassName)} />
        </div>
        {trend && trendValue && (
          <span className={cn(
            "ios-caption1 px-2 py-0.5 rounded-full",
            trend === "up" && "bg-ios-green/20 text-ios-green",
            trend === "down" && "bg-ios-red/20 text-ios-red",
            trend === "neutral" && "bg-ios-gray-4 text-ios-gray-1"
          )}>
            {trend === "up" && "↑"} {trend === "down" && "↓"} {trendValue}
          </span>
        )}
      </div>
      
      <p className="ios-caption1 text-muted-foreground mb-1">{title}</p>
      <p className="ios-title1 text-foreground">{value}</p>
      {subtitle && (
        <p className="ios-footnote text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

interface IOSProgressCardProps {
  title: string;
  current: number;
  total: number;
  color: string;
  className?: string;
  delay?: number;
}

export function IOSProgressCard({
  title,
  current,
  total,
  color,
  className,
  delay = 0,
}: IOSProgressCardProps) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div 
      className={cn("ios-card animate-ios-fade-in opacity-0", className)}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="ios-headline text-foreground">{title}</p>
        <p className="ios-subheadline text-muted-foreground">{percentage}%</p>
      </div>
      
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2">
        <p className="ios-caption1 text-muted-foreground">
          R$ {current.toLocaleString("pt-BR")}
        </p>
        <p className="ios-caption1 text-muted-foreground">
          R$ {total.toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}
