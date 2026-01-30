import { Briefcase, RefreshCw, ShieldAlert, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import { useDailyBriefing } from '@/hooks/useDailyBriefing';
import { cn } from '@/lib/utils';

export function DailyBriefing() {
  const {
    briefing,
    generatedAt,
    alertsCount,
    isLoading,
    isGenerating,
    error,
    regenerate,
  } = useDailyBriefing();

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/20 animate-pulse" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback message if no briefing and error
  const displayBriefing = briefing || (error 
    ? "Le briefing n'a pas pu être généré. Le système de veille continue de surveiller les sources." 
    : "Aucune actualité récente. Le système de veille est actif.");

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header with title and regenerate button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
              📍 Briefing du jour
            </h2>
            
            <div className="flex items-center gap-2">
              {generatedAt && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Généré <RelativeTime date={generatedAt} />
                </span>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={regenerate}
                disabled={isGenerating}
                title="Régénérer le briefing"
              >
                <RefreshCw 
                  className={cn(
                    "h-4 w-4 text-muted-foreground",
                    isGenerating && "animate-spin"
                  )} 
                />
              </Button>
            </div>
          </div>
          
          {/* Briefing content */}
          <p className={cn(
            "text-foreground leading-relaxed",
            isGenerating && "opacity-50"
          )}>
            {displayBriefing}
          </p>
          
          {/* Critical alerts indicator */}
          {alertsCount > 0 && (
            <p className="mt-3 text-signal-critical font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Attention : {alertsCount} alerte{alertsCount > 1 ? 's' : ''} critique{alertsCount > 1 ? 's' : ''} en cours.
            </p>
          )}
          
          {/* Error indicator (subtle) */}
          {error && !briefing && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Service temporairement indisponible
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
