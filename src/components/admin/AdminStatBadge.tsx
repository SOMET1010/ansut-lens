import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

interface AdminStatBadgeProps {
  value: string | number;
  label?: string;
  variant?: BadgeVariant;
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  muted: 'bg-muted text-muted-foreground border-border'
};

export function AdminStatBadge({ 
  value, 
  label, 
  variant = 'muted', 
  loading = false,
  className 
}: AdminStatBadgeProps) {
  if (loading) {
    return <Skeleton className="h-5 w-16 mt-2" />;
  }

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border mt-2',
        variantStyles[variant],
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        variant === 'success' && 'bg-emerald-500',
        variant === 'warning' && 'bg-amber-500',
        variant === 'error' && 'bg-red-500',
        variant === 'info' && 'bg-blue-500',
        variant === 'muted' && 'bg-muted-foreground'
      )} />
      <span>{value}{label ? ` ${label}` : ''}</span>
    </div>
  );
}
