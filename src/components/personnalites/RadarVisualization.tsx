import { useMemo } from 'react';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { Personnalite, CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RadarVisualizationProps {
  personnalites: Personnalite[];
  onActeurClick?: (acteur: Personnalite) => void;
}

const getCercleColor = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return { fill: '#3B82F6', stroke: '#2563EB' }; // blue
    case 2: return { fill: '#F97316', stroke: '#EA580C' }; // orange
    case 3: return { fill: '#22C55E', stroke: '#16A34A' }; // green
    case 4: return { fill: '#A855F7', stroke: '#9333EA' }; // purple
  }
};

export function RadarVisualization({ personnalites, onActeurClick }: RadarVisualizationProps) {
  // Grouper les acteurs par cercle et calculer les positions
  const positionedActeurs = useMemo(() => {
    const grouped: Record<CercleStrategique, Personnalite[]> = { 1: [], 2: [], 3: [], 4: [] };
    
    personnalites.forEach((p) => {
      const cercle = p.cercle || 2;
      grouped[cercle].push(p);
    });

    const result: Array<{
      personnalite: Personnalite;
      x: number;
      y: number;
      size: number;
    }> = [];

    // Pour chaque cercle, distribuer les acteurs en cercle
    ([1, 2, 3, 4] as CercleStrategique[]).forEach((cercle) => {
      const acteurs = grouped[cercle];
      const radius = getRadiusForCercle(cercle);
      
      acteurs.forEach((p, index) => {
        const angle = (index / acteurs.length) * 2 * Math.PI - Math.PI / 2;
        // Ajouter un peu de variation aléatoire mais déterministe
        const jitter = ((p.id.charCodeAt(0) % 10) - 5) * 3;
        const x = 50 + (radius + jitter) * Math.cos(angle);
        const y = 50 + (radius + jitter) * Math.sin(angle);
        // Taille proportionnelle au score d'influence (min 4, max 10)
        const size = 4 + (p.score_influence / 100) * 6;
        
        result.push({ personnalite: p, x, y, size });
      });
    });

    return result;
  }, [personnalites]);

  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto">
      {/* Cercles concentriques SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        {/* Cercle 4 (externe) */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 2" />
        {/* Cercle 3 */}
        <circle cx="50" cy="50" r="35" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 2" />
        {/* Cercle 2 */}
        <circle cx="50" cy="50" r="25" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 2" />
        {/* Cercle 1 (centre) */}
        <circle cx="50" cy="50" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 2" />
        {/* Centre */}
        <circle cx="50" cy="50" r="3" fill="hsl(var(--primary))" opacity="0.3" />
      </svg>

      {/* Labels des cercles */}
      <div className="absolute top-2 left-2 text-[10px] text-muted-foreground/60 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span>C1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span>C2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>C3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span>C4</span>
        </div>
      </div>

      {/* Points des acteurs */}
      <TooltipProvider>
        {positionedActeurs.map(({ personnalite, x, y, size }) => {
          const colors = getCercleColor(personnalite.cercle);
          const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();
          
          return (
            <Tooltip key={personnalite.id}>
              <TooltipTrigger asChild>
                <button
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                  onClick={() => onActeurClick?.(personnalite)}
                >
                  <Avatar 
                    className="border-2 shadow-md cursor-pointer"
                    style={{ 
                      width: `${size * 4}px`, 
                      height: `${size * 4}px`,
                      borderColor: colors.stroke,
                    }}
                  >
                    {personnalite.photo_url && (
                      <AvatarImage src={personnalite.photo_url} alt={personnalite.nom} />
                    )}
                    <AvatarFallback 
                      style={{ backgroundColor: colors.fill, color: 'white' }}
                      className="text-[8px] font-bold"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{personnalite.prenom} {personnalite.nom}</p>
                  {personnalite.fonction && (
                    <p className="text-xs text-muted-foreground">{personnalite.fonction}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full',
                      personnalite.cercle === 1 && 'bg-blue-100 text-blue-700',
                      personnalite.cercle === 2 && 'bg-orange-100 text-orange-700',
                      personnalite.cercle === 3 && 'bg-green-100 text-green-700',
                      personnalite.cercle === 4 && 'bg-purple-100 text-purple-700',
                    )}>
                      Cercle {personnalite.cercle}
                    </span>
                    <span>Score: {personnalite.score_influence}</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

function getRadiusForCercle(cercle: CercleStrategique): number {
  switch (cercle) {
    case 1: return 10;  // Centre
    case 2: return 22;
    case 3: return 33;
    case 4: return 43;  // Externe
  }
}
