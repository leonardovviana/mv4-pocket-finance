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
}: IOSStatCardProps) {
  const iconTextClassName = iconColor.includes("bg-secondary")
    ? "text-secondary-foreground"
    : iconColor.includes("bg-muted")
      ? "text-foreground"
      : "text-primary-foreground";

  return (
    <div 
      className={cn(
        "ios-card animate-ios-fade-in",
        className
      )}
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
      <p className="ios-title2 text-foreground tabular-nums truncate leading-tight">{value}</p>
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
}

export function IOSProgressCard({
  title,
  current,
  total,
  color,
  className,
}: IOSProgressCardProps) {
  const percentage = Math.round((current / total) * 100);
  const accentClass = color.includes("ios-green")
    ? "accent-[hsl(var(--ios-green))] [&::-webkit-progress-value]:bg-[hsl(var(--ios-green))]"
    : color.includes("ios-red")
      ? "accent-[hsl(var(--ios-red))] [&::-webkit-progress-value]:bg-[hsl(var(--ios-red))]"
      : "accent-[hsl(var(--primary))] [&::-webkit-progress-value]:bg-[hsl(var(--primary))]";
  
  return (
    <div 
      className={cn("ios-card animate-ios-fade-in", className)}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="ios-headline text-foreground">{title}</p>
        <p className="ios-subheadline text-muted-foreground">{percentage}%</p>
      </div>
      
      <progress
        value={current}
        max={total}
        className={cn(
          "w-full h-2 overflow-hidden rounded-full",
          "[&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-bar]:rounded-full",
          "[&::-webkit-progress-value]:rounded-full",
          accentClass
        )}
      />
      
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
