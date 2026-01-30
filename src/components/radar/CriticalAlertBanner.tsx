import { ShieldAlert, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/ui/relative-time';
import { Signal } from '@/types';

interface CriticalAlertBannerProps {
  signals: Signal[];
  onViewDetails?: (signal: Signal) => void;
}

export function CriticalAlertBanner({ signals, onViewDetails }: CriticalAlertBannerProps) {
  const criticalSignals = signals.filter(s => s.niveau === 'critical');
  
  if (criticalSignals.length === 0) return null;

  // Show the most recent critical signal
  const signal = criticalSignals[0];

  return (
    <div className="rounded-lg border-l-4 border-signal-critical bg-signal-critical/10 p-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <ShieldAlert className="h-6 w-6 text-signal-critical animate-pulse" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-signal-critical">
              Alerte Critique
            </span>
            {criticalSignals.length > 1 && (
              <span className="text-xs bg-signal-critical/20 text-signal-critical px-2 py-0.5 rounded-full">
                +{criticalSignals.length - 1} autre{criticalSignals.length > 2 ? 's' : ''}
              </span>
            )}
          </div>
          
          <h4 className="font-bold text-foreground">
            {signal.titre}
          </h4>
          
          {signal.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {signal.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Source: {signal.source_type || 'Système'}</span>
            <span>Impact: {signal.score_impact || 0}/100</span>
            {signal.date_detection && (
              <RelativeTime date={signal.date_detection} />
            )}
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="shrink-0 border-signal-critical/30 text-signal-critical hover:bg-signal-critical/10"
          onClick={() => onViewDetails?.(signal)}
        >
          Voir
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
