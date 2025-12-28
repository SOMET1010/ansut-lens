import { useState, useEffect } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RelativeTimeProps {
  date: Date | string;
  className?: string;
  showExact?: boolean;
  refreshInterval?: number;
}

export function RelativeTime({ 
  date, 
  className, 
  showExact = false,
  refreshInterval = 60000 
}: RelativeTimeProps) {
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const relative = formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
  
  const getExactTime = () => {
    if (isToday(dateObj)) {
      return `Aujourd'hui ${format(dateObj, 'HH:mm', { locale: fr })}`;
    }
    if (isYesterday(dateObj)) {
      return `Hier ${format(dateObj, 'HH:mm', { locale: fr })}`;
    }
    return format(dateObj, 'd MMM HH:mm', { locale: fr });
  };

  return (
    <span className={cn('text-muted-foreground', className)} title={format(dateObj, 'PPPp', { locale: fr })}>
      {showExact ? getExactTime() : relative}
    </span>
  );
}

interface FreshnessBadgeProps {
  date: Date | string;
  className?: string;
}

export function FreshnessBadge({ date, className }: FreshnessBadgeProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const hoursAgo = (Date.now() - dateObj.getTime()) / (1000 * 60 * 60);
  
  const getColor = () => {
    if (hoursAgo < 1) return 'bg-signal-positive';
    if (hoursAgo < 24) return 'bg-signal-warning';
    return 'bg-muted-foreground';
  };

  return (
    <span 
      className={cn('inline-block h-2 w-2 rounded-full animate-pulse', getColor(), className)}
      title={`${hoursAgo < 1 ? 'Moins d\'1h' : hoursAgo < 24 ? 'Moins de 24h' : 'Plus de 24h'}`}
    />
  );
}
