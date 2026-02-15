import { MessageSquare, Newspaper, ShieldAlert, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface RadarKpiTilesProps {
  mentions: number;
  articles: number;
  alertesActives: number;
  scoreInfluence: number;
  periodLabel: string;
  isLoading?: boolean;
}

interface KpiCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  subtext: string;
  colorClass: string;
  isLoading?: boolean;
}

function KpiCard({ icon, value, label, subtext, colorClass, isLoading }: KpiCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-lg", colorClass)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground truncate">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RadarKpiTiles({
  mentions,
  articles,
  alertesActives,
  scoreInfluence,
  periodLabel,
  isLoading = false,
}: RadarKpiTilesProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={<MessageSquare className="h-5 w-5 text-primary" />}
        value={mentions}
        label="Mentions"
        subtext={periodLabel}
        colorClass="bg-primary/10"
        isLoading={isLoading}
      />
      <KpiCard
        icon={<Newspaper className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        value={articles}
        label="Articles collectés"
        subtext={periodLabel}
        colorClass="bg-emerald-500/10"
        isLoading={isLoading}
      />
      <KpiCard
        icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
        value={alertesActives}
        label="Alertes actives"
        subtext={alertesActives > 0 ? 'Non traitées' : 'Aucune alerte'}
        colorClass="bg-destructive/10"
        isLoading={isLoading}
      />
      <KpiCard
        icon={<TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        value={scoreInfluence}
        label="Score d'influence"
        subtext="Moyenne des mentions"
        colorClass="bg-amber-500/10"
        isLoading={isLoading}
      />
    </div>
  );
}
