import { cn } from "@/lib/utils";

interface IOSPageProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  showLargeTitle?: boolean;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function IOSPage({ title, children, className, showLargeTitle = true, headerLeft, headerRight }: IOSPageProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background pb-[100px] ios-safe-top",
      className
    )}>
      <header className="sticky top-0 z-40 ios-blur bg-background/80 border-b border-border">
        <div className="ios-nav-bar px-4 flex items-center justify-between">
          <div className="min-w-[56px] flex justify-start flex-shrink-0">
            {headerLeft}
          </div>
          <h1 className="ios-headline text-foreground flex-1 text-center truncate px-2 min-w-0">{title}</h1>
          <div className="min-w-[56px] flex justify-end flex-shrink-0">
            {headerRight}
          </div>
        </div>
      </header>
      
      <main className="px-4 py-4">
        {showLargeTitle && (
          <h2 className="ios-largetitle text-foreground mb-4 animate-ios-fade-in">
            {title}
          </h2>
        )}
        <div className="space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

interface IOSScrollPageProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function IOSScrollPage({ title, children, className }: IOSScrollPageProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background pb-[100px]",
      className
    )}>
      <header className="sticky top-0 z-40 ios-blur bg-background/80 ios-safe-top">
        <div className="ios-nav-bar px-4 border-b border-border">
          <h1 className="ios-headline text-foreground">{title}</h1>
        </div>
      </header>
      
      <main className="ios-scroll overflow-auto">
        {children}
      </main>
    </div>
  );
}
