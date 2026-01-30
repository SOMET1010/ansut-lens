import { Badge } from '@/components/ui/badge';
import { Signal } from '@/types';
import { cn } from '@/lib/utils';

interface CompactRadarProps {
  signaux: Signal[];
  isLoading?: boolean;
}

const quadrantConfig = {
  tech: { label: 'Technologie', shortLabel: 'TECH' },
  regulation: { label: 'Régulation', shortLabel: 'RÉGUL.' },
  market: { label: 'Marché', shortLabel: 'MARCHÉ' },
  reputation: { label: 'Réputation', shortLabel: 'RÉPUT.' },
};

const niveauColors: Record<string, string> = {
  critical: 'text-signal-critical',
  warning: 'text-signal-warning',
  info: 'text-primary',
};

const niveauDots: Record<string, string> = {
  critical: 'bg-signal-critical',
  warning: 'bg-signal-warning',
  info: 'bg-primary',
};

export function CompactRadar({ signaux, isLoading }: CompactRadarProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 bg-muted rounded w-40" />
          <div className="h-5 bg-muted rounded w-24" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Group signals by quadrant
  const signalsByQuadrant = signaux.reduce((acc, signal) => {
    const quadrant = signal.quadrant || 'tech';
    if (!acc[quadrant]) acc[quadrant] = [];
    acc[quadrant].push(signal);
    return acc;
  }, {} as Record<string, Signal[]>);

  const activeSignalsCount = signaux.length;

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm text-foreground">
          📡 Radar Stratégique
        </h3>
        <Badge variant="outline" className="text-xs">
          {activeSignalsCount} signaux actifs
        </Badge>
      </div>

      {/* Quadrants grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
        {Object.entries(quadrantConfig).map(([key, config]) => {
          const quadrantSignals = signalsByQuadrant[key] || [];
          
          return (
            <div key={key} className="p-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {config.shortLabel}
              </h4>
              
              {quadrantSignals.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 italic">Aucun signal</p>
              ) : (
                <div className="space-y-1.5">
                  {quadrantSignals.slice(0, 3).map((signal) => (
                    <div 
                      key={signal.id} 
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", niveauDots[signal.niveau] || niveauDots.info)} />
                      <span className={cn("truncate", niveauColors[signal.niveau] || niveauColors.info)}>
                        {signal.titre.length > 25 ? signal.titre.substring(0, 25) + '...' : signal.titre}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        ({signal.score_impact || 0})
                      </span>
                    </div>
                  ))}
                  {quadrantSignals.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{quadrantSignals.length - 3} autres
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
