import { usePersonnalitesStats, CERCLE_LABELS } from '@/hooks/usePersonnalites';
import { Users, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

export function StatsBar() {
  const { data: stats, isLoading } = usePersonnalitesStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-card border border-border/50 animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mb-2" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Calcul de la complétude (simplifié : on estime 85% pour l'exemple)
  // Dans une vraie implémentation, on calculerait le % d'acteurs avec photo, bio, etc.
  const completude = 85;

  const kpis = [
    {
      label: 'Total Acteurs',
      value: stats.total,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Cercle 1 (Clés)',
      value: stats.parCercle[1],
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: 'Institutionnels',
    },
    {
      label: 'Alertes Actives',
      value: stats.alertesElevees,
      icon: AlertTriangle,
      color: stats.alertesElevees > 0 ? 'text-yellow-600' : 'text-muted-foreground',
      bgColor: stats.alertesElevees > 0 ? 'bg-yellow-100' : 'bg-muted',
      highlight: stats.alertesElevees > 0,
    },
    {
      label: 'Complétude',
      value: `${completude}%`,
      icon: CheckCircle2,
      color: completude >= 80 ? 'text-green-600' : 'text-orange-600',
      bgColor: completude >= 80 ? 'bg-green-100' : 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div 
          key={kpi.label} 
          className={cn(
            'p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow',
            kpi.highlight && 'ring-2 ring-yellow-400/50'
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{kpi.label}</p>
              {kpi.subtitle && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">{kpi.subtitle}</p>
              )}
            </div>
            <div className={cn('p-2.5 rounded-lg', kpi.bgColor)}>
              <kpi.icon className={cn('h-5 w-5', kpi.color)} />
            </div>
          </div>
        </div>
      ))}
      
      {/* Mini-breakdown des cercles */}
      <div className="col-span-2 md:col-span-4 flex items-center justify-center gap-6 py-3 px-4 bg-muted/30 rounded-lg">
        {([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => {
          const count = stats.parCercle[cercle];
          const { color, label } = CERCLE_LABELS[cercle];
          return (
            <div
              key={cercle}
              className="flex items-center gap-2"
              title={label}
            >
              <div className={cn('h-3 w-3 rounded-full', color)} />
              <span className="text-sm font-medium">{count}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">C{cercle}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
