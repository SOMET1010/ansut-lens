import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

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

  const segments = [
    { pct: pPos, label: 'Positif', colorBar: 'bg-emerald-500 dark:bg-emerald-400', colorText: 'text-emerald-600 dark:text-emerald-400', raw: positif },
    { pct: pNeu, label: 'Neutre', colorBar: 'bg-muted-foreground/30', colorText: 'text-muted-foreground', raw: neutre },
    { pct: pNeg, label: 'Négatif', colorBar: 'bg-red-500 dark:bg-red-400', colorText: 'text-red-600 dark:text-red-400', raw: negatif },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('space-y-1.5', className)}>
        <div className="w-full h-2 rounded-full overflow-hidden flex">
          {segments.map((seg) =>
            seg.pct > 0 ? (
              <Tooltip key={seg.label}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(seg.colorBar, 'transition-all cursor-default')}
                    style={{ width: `${seg.pct}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="font-semibold">{seg.pct}% {seg.label}</span>
                  <span className="text-muted-foreground ml-1">({seg.raw} mentions)</span>
                </TooltipContent>
              </Tooltip>
            ) : null
          )}
        </div>
        <div className="flex justify-between text-[10px] font-medium">
          {segments.map((seg) => (
            <span key={seg.label} className={seg.colorText}>{seg.pct}% {seg.label}</span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
