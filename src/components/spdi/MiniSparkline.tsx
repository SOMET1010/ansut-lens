import { cn } from '@/lib/utils';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export function MiniSparkline({ data, width = 80, height = 24, className }: MiniSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const trending = data[data.length - 1] >= data[0];

  return (
    <svg
      width={width}
      height={height}
      className={cn('inline-block', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={trending ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {(() => {
        const last = points[points.length - 1].split(',');
        return (
          <circle
            cx={last[0]}
            cy={last[1]}
            r="2"
            fill={trending ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
          />
        );
      })()}
    </svg>
  );
}
