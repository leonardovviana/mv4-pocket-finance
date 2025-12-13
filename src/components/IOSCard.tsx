import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface IOSCardProps {
  children: React.ReactNode;
  className?: string;
}

export function IOSCard({ children, className }: IOSCardProps) {
  return (
    <div className={cn("ios-card", className)}>
      {children}
    </div>
  );
}

interface IOSCardGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function IOSCardGroup({ children, className }: IOSCardGroupProps) {
  return (
    <div className={cn("ios-card-grouped", className)}>
      {children}
    </div>
  );
}

interface IOSListItemProps {
  icon?: React.ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export function IOSListItem({
  icon,
  iconBgColor = "bg-ios-blue",
  title,
  subtitle,
  value,
  showChevron = false,
  onClick,
  className,
}: IOSListItemProps) {
  const Component = onClick ? "button" : "div";
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "ios-list-item w-full text-left",
        onClick && "ios-tap cursor-pointer",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
            iconBgColor
          )}>
            <span className="text-primary-foreground">{icon}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="ios-body text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="ios-caption1 text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        {value && (
          <span className="ios-body text-muted-foreground">{value}</span>
        )}
        {showChevron && (
          <ChevronRight className="w-5 h-5 text-ios-gray-3" />
        )}
      </div>
    </Component>
  );
}

interface IOSSectionHeaderProps {
  title: string;
  className?: string;
}

export function IOSSectionHeader({ title, className }: IOSSectionHeaderProps) {
  return (
    <h3 className={cn(
      "ios-footnote text-muted-foreground uppercase tracking-wide px-4 mb-2",
      className
    )}>
      {title}
    </h3>
  );
}
