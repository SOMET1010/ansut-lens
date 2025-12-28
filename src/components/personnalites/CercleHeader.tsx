import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

interface CercleHeaderProps {
  cercle: CercleStrategique;
  count: number;
}

const getCercleEmoji = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return '🔵';
    case 2: return '🟠';
    case 3: return '🟢';
    case 4: return '🟣';
  }
};

export function CercleHeader({ cercle, count }: CercleHeaderProps) {
  const { label, color, description } = CERCLE_LABELS[cercle];
  const emoji = getCercleEmoji(cercle);

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={cn('h-3 w-3 rounded-full', color)} />
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <span>{emoji}</span>
            <span>Cercle {cercle} — {label}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {count} acteur{count > 1 ? 's' : ''}
      </div>
    </div>
  );
}
