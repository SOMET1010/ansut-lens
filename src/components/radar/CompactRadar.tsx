import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Signal, QuadrantType } from '@/types';
import { RadarCenterMap } from './RadarCenterMap';
import { QuadrantFilterBar } from './QuadrantFilterBar';

interface CompactRadarProps {
  signaux: Signal[];
  isLoading?: boolean;
}

const defaultOrder: QuadrantType[] = ['tech', 'regulation', 'market', 'reputation'];

export function CompactRadar({ signaux, isLoading }: CompactRadarProps) {
  const [activeQuadrants, setActiveQuadrants] = useState<Set<QuadrantType>>(new Set(defaultOrder));
  const [quadrantOrder, setQuadrantOrder] = useState<QuadrantType[]>(defaultOrder);

  const activeCount = signaux.filter(s => activeQuadrants.has(s.quadrant)).length;

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm text-foreground">📡 Radar Stratégique</h3>
        <Badge variant="outline" className="text-xs">
          {activeCount} signaux actifs
        </Badge>
      </div>

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
    </div>
  );
}
