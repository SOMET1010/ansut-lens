import { Signal, QuadrantType } from '@/types';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface RadarCenterMapProps {
  signaux: Signal[];
  activeQuadrants: Set<QuadrantType>;
  isLoading?: boolean;
}

const quadrantAngles: Record<QuadrantType, number> = {
  tech: -135,
  regulation: -45,
  market: 45,
  reputation: 135,
};

const quadrantColors: Record<QuadrantType, string> = {
  tech: '#3B82F6',
  regulation: '#F59E0B',
  market: '#22C55E',
  reputation: '#A855F7',
};

const quadrantLabels: Record<QuadrantType, { label: string; x: number; y: number }> = {
  tech: { label: 'TECH', x: 12, y: 50 },
  regulation: { label: 'RÉGUL.', x: 50, y: 10 },
  market: { label: 'MARCHÉ', x: 88, y: 50 },
  reputation: { label: 'RÉPUT.', x: 50, y: 92 },
};

const niveauFills: Record<string, string> = {
  critical: 'hsl(var(--signal-critical, 0 84% 60%))',
  warning: 'hsl(var(--signal-warning, 38 92% 50%))',
  info: 'hsl(var(--primary))',
};

function getSignalPosition(signal: Signal, index: number, total: number) {
  const baseAngle = quadrantAngles[signal.quadrant] || -135;
  const spread = total > 1 ? (index / (total - 1) - 0.5) * 70 : 0;
  const angle = (baseAngle + spread) * (Math.PI / 180);
  const impact = signal.score_impact || 0;
  const radius = 15 + (100 - impact) * 0.3;
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
}

const tendanceArrow: Record<string, string> = { up: '↑', down: '↓', stable: '→' };

export function RadarCenterMap({ signaux, activeQuadrants, isLoading }: RadarCenterMapProps) {
  if (isLoading) {
    return <Skeleton className="w-full aspect-square max-w-[480px] mx-auto rounded-full" />;
  }

  const filtered = signaux.filter(s => activeQuadrants.has(s.quadrant));

  // Group by quadrant for positioning
  const byQuadrant: Record<string, Signal[]> = {};
  filtered.forEach(s => {
    const q = s.quadrant || 'tech';
    if (!byQuadrant[q]) byQuadrant[q] = [];
    byQuadrant[q].push(s);
  });

  const positioned = filtered.map(signal => {
    const group = byQuadrant[signal.quadrant] || [];
    const idx = group.indexOf(signal);
    return { signal, ...getSignalPosition(signal, idx, group.length) };
  });

  return (
    <TooltipProvider delayDuration={200}>
      <svg viewBox="0 0 100 100" className="w-full max-w-[480px] mx-auto" role="img" aria-label="Radar stratégique">
        {/* Background */}
        <circle cx="50" cy="50" r="46" className="fill-muted/20 stroke-border" strokeWidth="0.3" />

        {/* Concentric rings */}
        {[30, 20, 10].map(r => (
          <circle key={r} cx="50" cy="50" r={r} fill="none" className="stroke-border" strokeWidth="0.2" strokeDasharray="1.5 1" />
        ))}

        {/* Cross-hair axes */}
        <line x1="4" y1="50" x2="96" y2="50" className="stroke-border" strokeWidth="0.2" />
        <line x1="50" y1="4" x2="50" y2="96" className="stroke-border" strokeWidth="0.2" />

        {/* Quadrant region fills (subtle) */}
        {Object.entries(quadrantAngles).map(([key]) => {
          const q = key as QuadrantType;
          if (!activeQuadrants.has(q)) return null;
          const startAngle = (quadrantAngles[q] - 45) * (Math.PI / 180);
          const endAngle = (quadrantAngles[q] + 45) * (Math.PI / 180);
          const r = 46;
          const x1 = 50 + r * Math.cos(startAngle);
          const y1 = 50 + r * Math.sin(startAngle);
          const x2 = 50 + r * Math.cos(endAngle);
          const y2 = 50 + r * Math.sin(endAngle);
          return (
            <path
              key={q}
              d={`M50,50 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
              fill={quadrantColors[q]}
              fillOpacity={0.06}
            />
          );
        })}

        {/* Quadrant labels */}
        {Object.entries(quadrantLabels).map(([key, { label, x, y }]) => {
          const q = key as QuadrantType;
          return (
            <text
              key={q}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground"
              fontSize="3"
              fontWeight="700"
              letterSpacing="0.08em"
              opacity={activeQuadrants.has(q) ? 1 : 0.3}
            >
              {label}
            </text>
          );
        })}

        {/* Center dot */}
        <circle cx="50" cy="50" r="1.2" className="fill-primary" opacity="0.5" />

        {/* Signal dots */}
        {positioned.map(({ signal, x, y }) => (
          <Tooltip key={signal.id}>
            <TooltipTrigger asChild>
              <circle
                cx={x}
                cy={y}
                r="1.8"
                fill={niveauFills[signal.niveau] || niveauFills.info}
                stroke="hsl(var(--background))"
                strokeWidth="0.4"
                className="cursor-pointer transition-transform hover:scale-150"
                style={{ filter: signal.niveau === 'critical' ? 'drop-shadow(0 0 1px red)' : undefined }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="font-semibold text-xs">{signal.titre}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>Impact: {signal.score_impact}</span>
                {signal.tendance && <span>{tendanceArrow[signal.tendance] || ''} {signal.tendance}</span>}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </svg>
    </TooltipProvider>
  );
}
