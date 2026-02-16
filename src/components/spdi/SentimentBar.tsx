import { cn } from '@/lib/utils';

interface SentimentBarProps {
  positif: number;
  neutre: number;
  negatif: number;
  compact?: boolean;
  className?: string;
}

export function SentimentBar({ positif, neutre, negatif, compact = false, className }: SentimentBarProps) {
  const total = positif + neutre + negatif || 1;
  const pPos = Math.round((positif / total) * 100);
  const pNeu = Math.round((neutre / total) * 100);
  const pNeg = 100 - pPos - pNeu;

  if (compact) {
    return (
      <div className={cn('w-full h-[3px] rounded-full overflow-hidden flex', className)}>
        {pPos > 0 && <div className="bg-emerald-500 dark:bg-emerald-400" style={{ width: `${pPos}%` }} />}
        {pNeu > 0 && <div className="bg-muted-foreground/30" style={{ width: `${pNeu}%` }} />}
        {pNeg > 0 && <div className="bg-red-500 dark:bg-red-400" style={{ width: `${pNeg}%` }} />}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="w-full h-2 rounded-full overflow-hidden flex">
        {pPos > 0 && <div className="bg-emerald-500 dark:bg-emerald-400 transition-all" style={{ width: `${pPos}%` }} />}
        {pNeu > 0 && <div className="bg-muted-foreground/30 transition-all" style={{ width: `${pNeu}%` }} />}
        {pNeg > 0 && <div className="bg-red-500 dark:bg-red-400 transition-all" style={{ width: `${pNeg}%` }} />}
      </div>
      <div className="flex justify-between text-[10px] font-medium">
        <span className="text-emerald-600 dark:text-emerald-400">{pPos}% Positif</span>
        <span className="text-muted-foreground">{pNeu}% Neutre</span>
        <span className="text-red-600 dark:text-red-400">{pNeg}% Négatif</span>
      </div>
    </div>
  );
}
