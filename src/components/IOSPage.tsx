import { cn } from "@/lib/utils";

interface IOSPageProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  showLargeTitle?: boolean;
}

export function IOSPage({ title, children, className, showLargeTitle = true }: IOSPageProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background pb-[100px] ios-safe-top",
      className
    )}>
      <header className="sticky top-0 z-40 ios-blur bg-background/80 border-b border-border">
        <div className="ios-nav-bar px-4">
          <h1 className="ios-headline text-foreground">{title}</h1>
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
