import { CERCLE_LABELS, usePersonnalitesStats } from '@/hooks/usePersonnalites';
import type { CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface CercleHeaderProps {
  cercle: CercleStrategique;
  count: number;
}

export function CercleHeader({ cercle, count }: CercleHeaderProps) {
  const { data: stats } = usePersonnalitesStats();
  const { label, color, description } = CERCLE_LABELS[cercle];
  
  // Calcul du pourcentage par rapport au total
  const total = stats?.total ?? 1;
  const percentage = Math.round((count / total) * 100);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        <div className={cn('h-4 w-4 rounded-full shadow-sm', color)} />
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <span>Cercle {cercle}</span>
            <span className="text-muted-foreground font-normal">•</span>
            <span className="text-muted-foreground font-normal">{label}</span>
          </h2>
          <p className="text-sm text-muted-foreground/80">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 sm:min-w-[180px]">
        <div className="flex-1">
          <Progress 
            value={percentage} 
            className="h-2"
          />
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-semibold">{count}</span>
          <span className="text-xs text-muted-foreground ml-1">
            acteur{count > 1 ? 's' : ''}
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            ({percentage}%)
          </span>
        </div>
      </div>
    </div>
  );
}
