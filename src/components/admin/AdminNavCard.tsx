import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type CardColor = 'blue' | 'purple' | 'orange' | 'emerald' | 'slate';
type BadgeVariant = 'default' | 'success' | 'warning' | 'info';

interface AdminNavCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string | number;
  badgeVariant?: BadgeVariant;
  color: CardColor;
  to: string;
  loading?: boolean;
}

const colorThemes: Record<CardColor, { iconBg: string; iconText: string; hoverIcon: string }> = {
  blue: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-600 dark:text-blue-400',
    hoverIcon: 'group-hover:bg-blue-600 group-hover:text-white',
  },
  purple: {
    iconBg: 'bg-purple-500/10',
    iconText: 'text-purple-600 dark:text-purple-400',
    hoverIcon: 'group-hover:bg-purple-600 group-hover:text-white',
  },
  orange: {
    iconBg: 'bg-orange-500/10',
    iconText: 'text-orange-600 dark:text-orange-400',
    hoverIcon: 'group-hover:bg-orange-600 group-hover:text-white',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    hoverIcon: 'group-hover:bg-emerald-600 group-hover:text-white',
  },
  slate: {
    iconBg: 'bg-slate-500/10',
    iconText: 'text-slate-600 dark:text-slate-400',
    hoverIcon: 'group-hover:bg-slate-600 group-hover:text-white',
  },
};

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

export function AdminNavCard({
  icon,
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  color,
  to,
  loading = false,
}: AdminNavCardProps) {
  const theme = colorThemes[color];

  if (loading) {
    return (
      <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl h-full">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:shadow-lg hover:border-primary/30 transition-all group text-left h-full"
    >
      <div
        className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors',
          theme.iconBg,
          theme.iconText,
          theme.hoverIcon
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          {badge !== undefined && (
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                badgeVariants[badgeVariant]
              )}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
