import { usePersonnalitesStats, CERCLE_LABELS } from '@/hooks/usePersonnalites';
import { Users, AlertTriangle } from 'lucide-react';
import type { CercleStrategique } from '@/types';

export function StatsBar() {
  const { data: stats, isLoading } = usePersonnalitesStats();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-6 w-48 bg-muted rounded" />
      </div>
    );
  }

  if (!stats) return null;

  const cercles: CercleStrategique[] = [1, 2, 3, 4];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <span className="font-semibold">{stats.total} acteurs</span>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex flex-wrap items-center gap-2">
        {cercles.map((cercle) => {
          const count = stats.parCercle[cercle];
          const { color, label } = CERCLE_LABELS[cercle];
          return (
            <div
              key={cercle}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50"
              title={label}
            >
              <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <span className="text-sm font-medium">{count}</span>
            </div>
          );
        })}
      </div>

      {stats.alertesElevees > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-signal-warning">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {stats.alertesElevees} alerte{stats.alertesElevees > 1 ? 's' : ''} élevée{stats.alertesElevees > 1 ? 's' : ''}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
