import { usePersonnalitesStats } from '@/hooks/usePersonnalites';
import { Users, TrendingUp } from 'lucide-react';

export function CompactStats() {
  const { data: stats, isLoading } = usePersonnalitesStats();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-3 py-2 bg-muted/50 rounded-lg animate-pulse">
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
        <div className="px-3 py-2 bg-muted/50 rounded-lg animate-pulse">
          <div className="h-5 w-12 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Total Acteurs */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border/50 rounded-lg shadow-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">{stats.total}</span>
          <span className="text-xs text-muted-foreground">acteurs</span>
        </div>
      </div>

      {/* Alertes actives (si > 0) */}
      {stats.alertesElevees > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50 rounded-lg shadow-sm">
          <TrendingUp className="h-4 w-4 text-yellow-600" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-yellow-700 dark:text-yellow-500">
              {stats.alertesElevees}
            </span>
            <span className="text-xs text-yellow-600/80 hidden sm:inline">alertes</span>
          </div>
        </div>
      )}
    </div>
  );
}
