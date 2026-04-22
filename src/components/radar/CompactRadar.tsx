import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Signal, QuadrantType } from '@/types';
import { RadarCenterMap } from './RadarCenterMap';
import { QuadrantFilterBar } from './QuadrantFilterBar';
import { SectionEmptyState } from './SectionEmptyState';

interface CompactRadarProps {
  signaux: Signal[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const defaultOrder: QuadrantType[] = ['tech', 'regulation', 'market', 'reputation'];

export function CompactRadar({ signaux, isLoading, isError, onRetry }: CompactRadarProps) {
  const [activeQuadrants, setActiveQuadrants] = useState<Set<QuadrantType>>(new Set(defaultOrder));
  const [quadrantOrder, setQuadrantOrder] = useState<QuadrantType[]>(defaultOrder);

  const activeCount = signaux.filter(s => activeQuadrants.has(s.quadrant)).length;
  const showEmpty = !isLoading && !isError && signaux.length === 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm text-foreground">📡 Radar Stratégique</h3>
        <Badge variant="outline" className="text-xs">
          {activeCount} signaux actifs
        </Badge>
      </div>

      {isError ? (
        <div className="p-4">
          <SectionEmptyState
            variant="error"
            title="Radar indisponible"
            description="Les signaux stratégiques n'ont pas pu être chargés."
            onRetry={onRetry}
            compact
          />
        </div>
      ) : showEmpty ? (
        <div className="p-4">
          <SectionEmptyState
            title="Aucun signal détecté"
            description="Aucun signal stratégique n'est actif. Lancez une collecte ou ajustez les mots-clés de veille."
            compact
          />
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="px-4 pt-3">
            <QuadrantFilterBar
              activeQuadrants={activeQuadrants}
              quadrantOrder={quadrantOrder}
              onFilterChange={setActiveQuadrants}
              onOrderChange={setQuadrantOrder}
            />
          </div>

          {/* Radar map */}
          <div className="p-4">
            <RadarCenterMap
              signaux={signaux}
              activeQuadrants={activeQuadrants}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
