import { Clock, ExternalLink, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { calculateFreshness, type FreshnessInfo } from '@/hooks/useActualites';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TermeMetier } from '@/components/common/TermeMetier';

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

  // Remplacement des emojis par des icônes Lucide pour l'accessibilité et la cohérence visuelle
  const getFreshnessIcon = (level: FreshnessInfo['level']) => {
    switch (level) {
      case 'fresh':
        return <CheckCircle2 className="h-3 w-3 text-[hsl(var(--signal-positive))]" aria-hidden="true" />;
      case 'recent':
        return <AlertCircle className="h-3 w-3 text-[hsl(var(--signal-warning))]" aria-hidden="true" />;
      case 'old':
        return <XCircle className="h-3 w-3 text-[hsl(var(--signal-critical))]" aria-hidden="true" />;
    }
  };

  // Ajout d'un texte descriptif pour chaque niveau de fraîcheur (accessibilité)
  const getFreshnessText = (level: FreshnessInfo['level']) => {
    switch (level) {
      case 'fresh':
        return 'Très récent';
      case 'recent':
        return 'Récent';
      case 'old':
        return 'Ancien';
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
        {getFreshnessIcon(freshness.level)}
        <span className="sr-only">{getFreshnessText(freshness.level)}</span>
        <Clock className="h-3 w-3" aria-hidden="true" />
        <span className={freshness.color}>
          <TermeMetier cle="fraicheur">{freshness.label}</TermeMetier>
        </span>
      </span>

      {showScore && (
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            // Remplacement des couleurs Tailwind littérales par les tokens sémantiques
            freshness.level === 'fresh' && 'border-[hsl(var(--signal-positive))] text-[hsl(var(--signal-positive))]',
            freshness.level === 'recent' && 'border-[hsl(var(--signal-warning))] text-[hsl(var(--signal-warning))]',
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
          aria-label="Ouvrir la source dans un nouvel onglet"
          title="Ouvrir la source"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
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
      <Clock className="h-4 w-4" aria-hidden="true" />
      <span>Dernière collecte : {formatDate(lastCollecteDate)}</span>
      {status === 'success' && nbResultats !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {/* Calcul de l'accord réel pour éviter le point médian */}
          {nbResultats} {nbResultats > 1 ? 'résultats' : 'résultat'}
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
