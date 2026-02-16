import { cn } from '@/lib/utils';

interface ShareOfVoiceDonutProps {
  monScore: number;
  moyenneCercle: number;
  rang: number;
  total: number;
  sharePercent?: number;
  className?: string;
}

export function ShareOfVoiceDonut({ monScore, moyenneCercle, rang, total, sharePercent = 0, className }: ShareOfVoiceDonutProps) {
  const size = 56;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxVal = Math.max(monScore, moyenneCercle, 1);
  const ratio = monScore / maxVal;
  const offset = circumference * (1 - ratio);
  const ecart = moyenneCercle > 0 ? ((monScore - moyenneCercle) / moyenneCercle * 100) : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
          {sharePercent}%
        </span>
      </div>
      <div className="text-xs space-y-0.5">
        <div className="font-bold text-foreground">{rang}<sup>e</sup>/{total}</div>
        <div className={cn(
          'font-medium',
          ecart >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        )}>
          {ecart >= 0 ? '+' : ''}{ecart.toFixed(1)}% vs moy
        </div>
      </div>
    </div>
  );
}
