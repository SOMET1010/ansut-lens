import { Calendar, Download, RefreshCw, ChevronDown, Sparkles, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CollectePhase } from '@/hooks/useActualites';

interface WatchHeaderProps {
  newArticlesCount: number;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
  collectePhase?: CollectePhase;
  onBatchSentiment?: () => void;
  isBatchingSentiment?: boolean;
}

const periodLabels: Record<string, string> = {
  '24h': "Aujourd'hui",
  '72h': '3 derniers jours',
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  'all': 'Tout'
};

const phaseLabels: Record<CollectePhase, string> = {
  idle: 'Rafraîchir',
  collecting: 'Collecte en cours…',
  sentiment: 'Analyse sentiments…',
  done: 'Terminé ✓',
};

export function WatchHeader({
  newArticlesCount,
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  onExport,
  isRefreshing,
  collectePhase = 'idle',
  onBatchSentiment,
  isBatchingSentiment
}: WatchHeaderProps) {
  const isActive = collectePhase !== 'idle' && collectePhase !== 'done';
  const refreshLabel = isRefreshing ? phaseLabels[collectePhase] : 'Rafraîchir';

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Actualités & Veille</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {newArticlesCount > 0 
            ? `${newArticlesCount} article${newArticlesCount > 1 ? 's' : ''} collecté${newArticlesCount > 1 ? 's' : ''}`
            : 'Aucun nouvel article'
          }
        </p>
      </div>

      <div className="flex gap-3 w-full md:w-auto flex-wrap">
        {/* Sélecteur de période */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{periodLabels[selectedPeriod] || "Aujourd'hui"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(periodLabels).map(([value, label]) => (
              <DropdownMenuItem 
                key={value}
                onClick={() => onPeriodChange(value)}
                className={selectedPeriod === value ? 'bg-accent' : ''}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bouton Rafraîchir avec phase */}
        <Button 
          variant="outline" 
          onClick={onRefresh}
          disabled={isRefreshing}
          className={collectePhase === 'sentiment' ? 'border-primary/50 text-primary' : collectePhase === 'done' ? 'border-green-500/50 text-green-600' : ''}
        >
          {collectePhase === 'sentiment' ? (
            <Brain className="h-4 w-4 mr-2 animate-pulse" />
          ) : (
            <RefreshCw className={`h-4 w-4 mr-2 ${isActive ? 'animate-spin' : ''}`} />
          )}
          {refreshLabel}
        </Button>

        {/* Bouton Analyser sentiments */}
        {onBatchSentiment && (
          <Button variant="outline" onClick={onBatchSentiment} disabled={isBatchingSentiment}>
            <Sparkles className={`h-4 w-4 mr-2 ${isBatchingSentiment ? 'animate-spin' : ''}`} />
            Analyser sentiments
          </Button>
        )}

        {/* Bouton Export */}
        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        )}
      </div>
    </div>
  );
}
