import { AlertCircle, Inbox, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Variant = 'empty' | 'error' | 'offline';

interface SectionEmptyStateProps {
  variant?: Variant;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

const defaultIcons: Record<Variant, React.ReactNode> = {
  empty: <Inbox className="h-8 w-8" />,
  error: <AlertCircle className="h-8 w-8" />,
  offline: <WifiOff className="h-8 w-8" />,
};

const variantStyles: Record<Variant, string> = {
  empty: 'text-muted-foreground bg-muted/30',
  error: 'text-destructive bg-destructive/10',
  offline: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
};

export function SectionEmptyState({
  variant = 'empty',
  title,
  description,
  icon,
  onRetry,
  retryLabel = 'Réessayer',
  className,
  compact = false,
}: SectionEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border',
        compact ? 'py-6 px-4' : 'py-10 px-6',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn('rounded-full p-3 mb-3', variantStyles[variant])}>
        {icon || defaultIcons[variant]}
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
