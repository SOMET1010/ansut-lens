import { Clock, ExternalLink } from 'lucide-react';
import { calculateFreshness, type FreshnessInfo } from '@/hooks/useActualites';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FreshnessIndicatorProps {
  datePublication: string | null;
  sourceUrl?: string | null;
  showScore?: boolean;
  className?: string;
}

export function FreshnessIndicator({ 
  datePublication, 
  sourceUrl, 
  showScore = false,
  className 
}: FreshnessIndicatorProps) {
  const freshness = calculateFreshness(datePublication);

  const getFreshnessIcon = (level: FreshnessInfo['level']) => {
    switch (level) {
      case 'fresh':
        return '🟢';
      case 'recent':
        return '🟡';
      case 'old':
        return '🔴';
    }
  };

  const getFreshnessScore = (ageHours: number): number => {
    if (ageHours < 6) return 100;
    if (ageHours < 24) return 80;
    if (ageHours < 48) return 60;
    if (ageHours < 72) return 40;
    if (ageHours < 168) return 20;
    return 0;
  };

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="flex items-center gap-1">
        <span>{getFreshnessIcon(freshness.level)}</span>
        <Clock className="h-3 w-3" />
        <span className={freshness.color}>{freshness.label}</span>
      </span>

      {showScore && (
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            freshness.level === 'fresh' && 'border-signal-positive text-signal-positive',
            freshness.level === 'recent' && 'border-signal-warning text-signal-warning',
            freshness.level === 'old' && 'border-muted-foreground text-muted-foreground'
          )}
        >
          {getFreshnessScore(freshness.ageHours)}%
        </Badge>
      )}

      {sourceUrl && (
        <a 
          href={sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

interface CollecteStatusProps {
  lastCollecteDate: string | null;
  status?: 'success' | 'error' | 'loading';
  nbResultats?: number;
}

export function CollecteStatus({ lastCollecteDate, status, nbResultats }: CollecteStatusProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Dernière collecte : {formatDate(lastCollecteDate)}</span>
      {status === 'success' && nbResultats !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {nbResultats} résultats
        </Badge>
      )}
      {status === 'error' && (
        <Badge variant="destructive" className="text-xs">
          Erreur
        </Badge>
      )}
      {status === 'loading' && (
        <Badge variant="outline" className="text-xs animate-pulse">
          En cours...
        </Badge>
      )}
    </div>
  );
}
